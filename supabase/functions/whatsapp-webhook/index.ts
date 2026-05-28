// @ts-nocheck
/**
 * BTR Paraíso II — Webhook Twilio WhatsApp
 *
 * Recebe mensagens do Twilio, salva na inbox, dispara pipeline:
 *  - Áudio → Whisper → texto
 *  - Imagem → Supabase Storage
 *  - Texto → guardado
 *  - Buffer de 60s → Claude estrutura RDO → salva como rascunho
 *  - Responde WhatsApp com link de revisão
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM")!; // ex: whatsapp:+5562...
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SITE_BASE_URL = Deno.env.get("SITE_BASE_URL") || "https://btr-paraiso-ii.netlify.app";

const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUFFER_SECONDS = 60; // tempo para agregar mensagens antes de gerar RDO

// ============================================================
// Helpers
// ============================================================
function twilioAuthHeader(): string {
  return "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
}

async function downloadTwilioMedia(url: string): Promise<{ buffer: Uint8Array; contentType: string }> {
  const resp = await fetch(url, { headers: { Authorization: twilioAuthHeader() } });
  if (!resp.ok) throw new Error(`Twilio media download failed: ${resp.status}`);
  return {
    buffer: new Uint8Array(await resp.arrayBuffer()),
    contentType: resp.headers.get("content-type") || "application/octet-stream",
  };
}

async function sendWhatsAppReply(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const form = new URLSearchParams();
  form.set("From", TWILIO_WHATSAPP_FROM);
  form.set("To", to);
  form.set("Body", body);
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: twilioAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
}

async function transcribeWithWhisper(buffer: Uint8Array, contentType: string): Promise<string> {
  const form = new FormData();
  const blob = new Blob([buffer], { type: contentType });
  const ext = contentType.includes("ogg") ? "ogg" : contentType.includes("mpeg") ? "mp3" : "audio";
  form.append("file", blob, `audio.${ext}`);
  form.append("model", "whisper-1");
  form.append("language", "pt");
  form.append("response_format", "text");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  if (!resp.ok) throw new Error(`Whisper failed: ${resp.status} ${await resp.text()}`);
  return (await resp.text()).trim();
}

async function uploadPhotoToStorage(
  buffer: Uint8Array,
  contentType: string,
  rdoData: string,
): Promise<string> {
  const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
  const path = `whatsapp/${rdoData}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
  const { error } = await supa.storage
    .from("fotos-obra")
    .upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

// ============================================================
// Webhook handler
// ============================================================
async function handleWebhook(formData: FormData): Promise<Response> {
  const messageSid = formData.get("MessageSid")?.toString() || "";
  const from = formData.get("From")?.toString() || "";
  const to = formData.get("To")?.toString() || "";
  const body = formData.get("Body")?.toString() || "";
  const numMedia = parseInt(formData.get("NumMedia")?.toString() || "0");

  const mediaUrls: string[] = [];
  const mediaTypes: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    mediaUrls.push(formData.get(`MediaUrl${i}`)?.toString() || "");
    mediaTypes.push(formData.get(`MediaContentType${i}`)?.toString() || "");
  }

  // 1) Verificar se o número está autorizado
  const numero = from.replace("whatsapp:", "");
  const { data: perfil } = await supa
    .from("perfis")
    .select("id, nome, papel, whatsapp_numero")
    .eq("whatsapp_numero", numero)
    .eq("ativo", true)
    .single();

  if (!perfil) {
    await sendWhatsAppReply(
      from,
      `⛔ Número não autorizado. Solicite ao admin que cadastre o WhatsApp ${numero} no perfil.`,
    );
    return new Response("Unauthorized", { status: 200 });
  }

  if (!["dono", "engenheiro", "mestre"].includes(perfil.papel)) {
    await sendWhatsAppReply(from, `🔒 Seu papel (${perfil.papel}) não tem permissão para criar RDOs.`);
    return new Response("Forbidden", { status: 200 });
  }

  // 2) Salvar mensagem raw no inbox
  const { data: inboxRow, error: insErr } = await supa
    .from("whatsapp_inbox")
    .insert({
      twilio_message_sid: messageSid,
      twilio_from: from,
      twilio_to: to,
      body,
      num_media: numMedia,
      media_urls: mediaUrls,
      media_types: mediaTypes,
      status: "pending",
    })
    .select()
    .single();

  if (insErr) {
    console.error("Inbox insert error:", insErr);
    return new Response("DB error", { status: 500 });
  }

  // 3) Processar mídia em background (responder webhook rápido)
  EdgeRuntime.waitUntil(processMessage(inboxRow.id, from, body, mediaUrls, mediaTypes, perfil));

  // 4) Resposta imediata pro Twilio (vazia ou com confirmação leve)
  const ack = numMedia > 0
    ? `📥 Recebi ${numMedia} mídia(s). Processando...`
    : `📥 Recebi sua mensagem. Aguardando 60s antes de criar o RDO (mande mais mídia se quiser).`;
  await sendWhatsAppReply(from, ack);

  return new Response("OK", { status: 200 });
}

// ============================================================
// Pipeline assíncrono: download mídia, transcreve, agrupa
// ============================================================
async function processMessage(
  inboxId: number,
  from: string,
  body: string,
  mediaUrls: string[],
  mediaTypes: string[],
  perfil: any,
) {
  let transcribed = "";
  const photoPaths: string[] = [];
  const today = new Date().toISOString().substring(0, 10);

  try {
    await supa.from("whatsapp_inbox").update({ status: "transcribing" }).eq("id", inboxId);

    for (let i = 0; i < mediaUrls.length; i++) {
      const url = mediaUrls[i];
      const type = mediaTypes[i];

      if (type.startsWith("audio/")) {
        const { buffer, contentType } = await downloadTwilioMedia(url);
        const text = await transcribeWithWhisper(buffer, contentType);
        transcribed += (transcribed ? " " : "") + text;
      } else if (type.startsWith("image/")) {
        const { buffer, contentType } = await downloadTwilioMedia(url);
        const path = await uploadPhotoToStorage(buffer, contentType, today);
        photoPaths.push(path);
      }
    }

    await supa
      .from("whatsapp_inbox")
      .update({
        status: "transcribed",
        transcribed_text: transcribed || null,
        stored_photo_paths: photoPaths,
        processed_at: new Date().toISOString(),
      })
      .eq("id", inboxId);

    // 4) Verificar se já tem batch pendente. Se não, agendar batch para 60s
    await scheduleOrAggregateBatch(from, perfil);
  } catch (err) {
    console.error(`processMessage ${inboxId} error:`, err);
    await supa
      .from("whatsapp_inbox")
      .update({ status: "failed", error: String(err) })
      .eq("id", inboxId);
    await sendWhatsAppReply(from, `❌ Erro processando: ${String(err).substring(0, 200)}`);
  }
}

// ============================================================
// Aguardar 60s sem novas mensagens → gerar RDO
// ============================================================
async function scheduleOrAggregateBatch(from: string, perfil: any) {
  // Estratégia simples: dorme 60s, depois pega TODAS as mensagens ainda não-batched desse from
  await new Promise((r) => setTimeout(r, BUFFER_SECONDS * 1000));

  // Buscar mensagens pendentes (transcribed + sem batch_id) desse from
  const { data: msgs } = await supa
    .from("whatsapp_inbox")
    .select("*")
    .eq("twilio_from", from)
    .in("status", ["transcribed", "pending"])
    .is("batch_id", null)
    .order("received_at", { ascending: true });

  if (!msgs || msgs.length === 0) return;

  // Reservar batch_id
  const batchId = Date.now();
  const ids = msgs.map((m) => m.id);
  await supa.from("whatsapp_inbox").update({ batch_id: batchId, status: "batched" }).in("id", ids);

  // Agregar texto + fotos
  const textoCompleto = msgs
    .map((m) => (m.body ? m.body + " " : "") + (m.transcribed_text || ""))
    .join("\n")
    .trim();
  const todasFotos: string[] = [];
  msgs.forEach((m) => {
    if (Array.isArray(m.stored_photo_paths)) todasFotos.push(...m.stored_photo_paths);
  });

  // 5) Chamar Claude para estruturar RDO
  const rdoJson = await chamarClaudeParaRdo(textoCompleto, todasFotos.length, perfil);

  // 6) Salvar como rascunho
  const { data: draft } = await supa
    .from("rdos_drafts")
    .insert({
      origem: "whatsapp_ia",
      twilio_from: from,
      data: rdoJson.data || new Date().toISOString().substring(0, 10),
      numero_sugerido: rdoJson.numero_sugerido,
      comentario: rdoJson.comentario_geral,
      clima_manha: rdoJson.clima_manha,
      clima_tarde: rdoJson.clima_tarde,
      ia_response: rdoJson,
      ia_model: "claude-sonnet-4-6",
      ia_confidence: rdoJson._confidence || 0.85,
      status: "pendente",
      mensagens_ids: ids,
      fotos_paths: todasFotos,
    })
    .select()
    .single();

  // Atualizar inbox com draft_id
  await supa.from("whatsapp_inbox").update({ rdo_draft_id: draft.id }).in("id", ids);

  // Resposta no WhatsApp
  const linkRevisao = `${SITE_BASE_URL}/admin-rdos.html?draft=${draft.id}`;
  const resumo = [
    `✅ RDO estruturado!`,
    ``,
    `📅 Data: ${draft.data}`,
    `📝 Atividades: ${rdoJson.atividades?.length || 0}`,
    `📷 Fotos: ${todasFotos.length}`,
    `⚠️ Ocorrências: ${rdoJson.ocorrencias?.length || 0}`,
    ``,
    `👉 Revisar e aprovar:`,
    linkRevisao,
  ].join("\n");
  await sendWhatsAppReply(from, resumo);
}

// ============================================================
// Claude — estrutura o RDO
// ============================================================
async function chamarClaudeParaRdo(texto: string, numFotos: number, perfil: any): Promise<any> {
  const today = new Date().toISOString().substring(0, 10);

  const systemPrompt = `Você é um assistente que estrutura Relatórios Diários de Obra (RDO) brasileiros para uma obra residencial BTR de 2 casas em Senador Canedo/GO da Olive Tree Soluções Imobiliarias.

CONTEXTO DA OBRA:
- 20 etapas NBR (códigos '1' a '20') + 7 itens fora (F1-F7) + T1 (terreno)
- Etapa 1: Serviços Preliminares
- Etapa 2: Movimento de Terra / Fundações
- Etapa 3: Estrutura
- Etapa 4: Alvenaria e Vedações
- Etapa 5: Cobertura
- Etapa 6: Instalações Hidráulicas
- Etapa 7: Instalações Elétricas
- Etapa 8: Esquadrias
- F1: Gesso · F2: Rufos e calhas · F3: Marcenaria
- F4: Muros de arrimo · F5: Muros perimetrais e calçadas
- F6: Fossas e sumidouros · F7: Vidraçaria

RETORNE APENAS JSON VÁLIDO (sem markdown, sem comentários), com esta estrutura:

{
  "data": "YYYY-MM-DD",
  "numero_sugerido": número ou null,
  "clima_manha": "Claro" | "Nublado" | "Chuvoso" | "Parcial",
  "clima_tarde": "Claro" | "Nublado" | "Chuvoso" | "Parcial",
  "condicao": "Praticável" | "Impraticável" | "Parcial",
  "atividades": [
    {
      "cod_etapa": "1" | "2" | ... | "F1" | ... | "F7",
      "etapa_nome": "nome da etapa",
      "descricao": "o que foi feito",
      "pct_executado": 0.0-1.0,
      "status": "A Iniciar" | "Em Execução" | "Concluída",
      "mao_obra_valor": número ou 0,
      "material_valor": número ou 0
    }
  ],
  "mao_obra_efetivo": [
    {"funcao": "Pedreiro" | "Servente" | "Ajudante" | "Eletricista" | "Encanador" | "Carpinteiro" | "Mestre", "profissional": "nome", "qtd": 1, "horas": 8}
  ],
  "material_recebido": [
    {"item": "areia/cimento/...", "qtd": "X sacos/m³", "fornecedor": "nome"}
  ],
  "ocorrencias": [
    {"tipo": "Atraso" | "Acidente" | "Risco Técnico" | "Outro", "descricao": "...", "severidade": "Baixa" | "Média" | "Alta" | "Crítica"}
  ],
  "comentario_geral": "resumo do dia",
  "alertas_para_investidor": ["pontos que o dono deve saber"],
  "_confidence": 0.0-1.0
}

REGRAS:
- Identifique etapa pelo contexto ("concretagem da sapata" → 2, "muro de arrimo" → F4, "parede sendo levantada" → 4, "telhado" → 5, "esgoto" → 6, "fiação" → 7)
- Para áreas externas (calçada/muro divisa/garagem), use F5
- Se houver foto sem texto, descreva como "Foto enviada — sem contexto textual" e use baixa confidence
- Se mencionar valores ($/R$), classifique como mao_obra_valor ou material_valor
- Data: use a data de hoje se não especificado (${today})
- Numero_sugerido: pode deixar null que o sistema atribui`;

  const userPrompt = `Mensagem recebida do ${perfil.nome} (papel: ${perfil.papel}) via WhatsApp em ${today}:

"${texto}"

${numFotos > 0 ? `[${numFotos} foto(s) anexada(s) — não precisa descrever, só registre no comentário que houveram fotos]` : ""}

Estruture o RDO em JSON conforme o schema. Retorne SOMENTE o JSON, sem qualquer texto adicional.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!resp.ok) throw new Error(`Claude failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  const content = data.content?.[0]?.text || "{}";

  // Limpar markdown se Claude colocar
  const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse Claude JSON:", cleaned);
    return { _confidence: 0.1, comentario_geral: cleaned, atividades: [] };
  }
}

// ============================================================
// Entry point
// ============================================================
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Use POST", { status: 405 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let formData: FormData;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      formData = new FormData();
      new URLSearchParams(text).forEach((v, k) => formData.append(k, v));
    } else {
      formData = await req.formData();
    }

    return await handleWebhook(formData);
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal error: " + String(err), { status: 500 });
  }
});
