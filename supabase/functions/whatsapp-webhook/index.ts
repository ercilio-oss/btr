// @ts-nocheck
/**
 * BTR Paraíso II — Webhook Z-API WhatsApp v4 (com suporte a GRUPOS)
 *
 * Funcionalidades:
 *  - Recebe mensagens individuais (DM) ou de grupo
 *  - Filtra grupos pelo nome configurado em config_obra.whatsapp_grupo_nome
 *  - Identifica remetente em grupos via participantPhone
 *  - Áudio → Whisper → texto
 *  - Imagem → Supabase Storage bucket fotos-obra
 *  - Buffer 60s → Claude Sonnet 4.6 estrutura RDO → salva como rascunho
 *  - Responde no grupo (ou DM) com link de revisão
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SITE_BASE_URL = Deno.env.get("SITE_BASE_URL") || "https://btr-paraiso-ii.netlify.app";

const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`;
const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUFFER_SECONDS = 60;

function zapiHeaders() {
  return { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN };
}

async function sendWhatsAppText(phone: string, message: string) {
  const resp = await fetch(`${ZAPI_BASE}/send-text`, {
    method: "POST", headers: zapiHeaders(),
    body: JSON.stringify({ phone, message }),
  });
  if (!resp.ok) console.error("sendWhatsApp falhou", resp.status, await resp.text());
  return resp.ok;
}

async function downloadMediaUrl(url: string) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Media download failed: ${resp.status}`);
  return {
    buffer: new Uint8Array(await resp.arrayBuffer()),
    contentType: resp.headers.get("content-type") || "application/octet-stream",
  };
}

async function transcribeWithWhisper(buffer: Uint8Array, contentType: string): Promise<string> {
  const form = new FormData();
  const blob = new Blob([buffer], { type: contentType });
  const ext = contentType.includes("ogg") ? "ogg" : contentType.includes("mpeg") ? "mp3" : contentType.includes("webm") ? "webm" : "audio";
  form.append("file", blob, `audio.${ext}`);
  form.append("model", "whisper-1");
  form.append("language", "pt");
  form.append("response_format", "text");
  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: form,
  });
  if (!resp.ok) throw new Error(`Whisper failed: ${resp.status} ${await resp.text()}`);
  return (await resp.text()).trim();
}

async function uploadPhotoToStorage(buffer: Uint8Array, contentType: string, rdoData: string): Promise<string> {
  const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
  const path = `whatsapp/${rdoData}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
  const { error } = await supa.storage.from("fotos-obra").upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

async function getGruposAutorizados(): Promise<string[]> {
  const { data } = await supa.from("config_obra").select("chave, valor")
    .in("chave", ["whatsapp_grupo_nome", "whatsapp_grupos_extras"]);
  const map: any = {};
  (data || []).forEach((c: any) => { map[c.chave] = c.valor; });
  const grupos = [map.whatsapp_grupo_nome].filter(Boolean);
  if (map.whatsapp_grupos_extras) {
    map.whatsapp_grupos_extras.split(",").forEach((g: string) => { if (g.trim()) grupos.push(g.trim()); });
  }
  return grupos.map((g: string) => g.toLowerCase());
}

async function handleWebhook(payload: any): Promise<Response> {
  if (payload.fromMe === true) return new Response("Ignored (fromMe)", { status: 200 });

  const isGroup = payload.isGroup === true;
  const groupPhone = payload.phone || "";
  const participantPhone = payload.participantPhone || "";
  const groupName = isGroup ? (payload.chatName || "") : "";
  const senderName = payload.senderName || "Desconhecido";

  if (isGroup) {
    const gruposAutorizados = await getGruposAutorizados();
    const nomeNorm = groupName.toLowerCase();
    const autorizado = gruposAutorizados.some(g => nomeNorm.includes(g) || g.includes(nomeNorm));
    if (!autorizado) {
      console.log(`Grupo não autorizado: "${groupName}" (autorizados: ${gruposAutorizados.join(", ")})`);
      return new Response("Group not authorized", { status: 200 });
    }
  }

  const senderPhone = isGroup ? participantPhone : groupPhone;
  if (!senderPhone) return new Response("No sender", { status: 400 });

  const numeroFmt = senderPhone.startsWith("+") ? senderPhone : `+${senderPhone}`;
  const replyTo = isGroup ? groupPhone : senderPhone;
  const messageId = payload.messageId || payload.id || crypto.randomUUID();

  let body = "";
  const mediaUrls: string[] = [];
  const mediaTypes: string[] = [];

  if (payload.text?.message) {
    body = payload.text.message;
  } else if (payload.image) {
    mediaUrls.push(payload.image.imageUrl);
    mediaTypes.push(payload.image.mimeType || "image/jpeg");
    if (payload.image.caption) body = payload.image.caption;
  } else if (payload.audio) {
    mediaUrls.push(payload.audio.audioUrl);
    mediaTypes.push(payload.audio.mimeType || "audio/ogg");
  } else if (payload.video) {
    mediaUrls.push(payload.video.videoUrl);
    mediaTypes.push(payload.video.mimeType || "video/mp4");
    if (payload.video.caption) body = payload.video.caption;
  } else if (payload.document) {
    mediaUrls.push(payload.document.documentUrl);
    mediaTypes.push(payload.document.mimeType || "application/octet-stream");
  } else {
    return new Response("Tipo não suportado", { status: 200 });
  }

  const { data: perfil } = await supa
    .from("perfis")
    .select("id, nome, papel, whatsapp_numero")
    .eq("whatsapp_numero", numeroFmt)
    .eq("ativo", true)
    .single();

  if (!perfil) {
    if (!isGroup) {
      await sendWhatsAppText(replyTo, `⛔ Número não autorizado. Cadastre o WhatsApp ${numeroFmt} no sistema BTR.`);
    }
    console.log(`Numero nao autorizado: ${numeroFmt} (grupo=${isGroup})`);
    return new Response("Unauthorized", { status: 200 });
  }

  if (!["dono", "engenheiro", "mestre"].includes(perfil.papel)) {
    if (!isGroup) {
      await sendWhatsAppText(replyTo, `🔒 Seu papel (${perfil.papel}) não tem permissão para criar RDOs.`);
    }
    return new Response("Forbidden", { status: 200 });
  }

  const { data: inboxRow, error: insErr } = await supa
    .from("whatsapp_inbox")
    .insert({
      twilio_message_sid: messageId,
      twilio_from: numeroFmt,
      twilio_to: replyTo,
      body,
      num_media: mediaUrls.length,
      media_urls: mediaUrls,
      media_types: mediaTypes,
      status: "pending",
      is_group: isGroup,
      group_name: groupName,
      participant_phone: numeroFmt,
      sender_name: senderName,
    })
    .select().single();

  if (insErr) { console.error("Inbox insert error:", insErr); return new Response("DB error", { status: 500 }); }

  EdgeRuntime.waitUntil(processMessage(inboxRow.id, replyTo, numeroFmt, mediaUrls, mediaTypes, perfil, isGroup, senderName));

  const ack = mediaUrls.length > 0
    ? `📥 Recebi ${mediaUrls.length} mídia(s) de ${senderName}. Processando...`
    : `📥 ${senderName}, recebi sua mensagem. Aguardando 60s antes de criar o RDO (mande mais mídia se quiser).`;
  await sendWhatsAppText(replyTo, ack);

  return new Response("OK", { status: 200 });
}

async function processMessage(inboxId: number, replyTo: string, numeroFmt: string, mediaUrls: string[], mediaTypes: string[], perfil: any, isGroup: boolean, senderName: string) {
  let transcribed = "";
  const photoPaths: string[] = [];
  const today = new Date().toISOString().substring(0, 10);

  try {
    await supa.from("whatsapp_inbox").update({ status: "transcribing" }).eq("id", inboxId);

    for (let i = 0; i < mediaUrls.length; i++) {
      const url = mediaUrls[i]; const type = mediaTypes[i];
      if (type.startsWith("audio/") || type === "application/ogg") {
        const { buffer, contentType } = await downloadMediaUrl(url);
        const text = await transcribeWithWhisper(buffer, contentType);
        transcribed += (transcribed ? " " : "") + text;
      } else if (type.startsWith("image/")) {
        const { buffer, contentType } = await downloadMediaUrl(url);
        const path = await uploadPhotoToStorage(buffer, contentType, today);
        photoPaths.push(path);
      }
    }

    await supa.from("whatsapp_inbox").update({
      status: "transcribed",
      transcribed_text: transcribed || null,
      stored_photo_paths: photoPaths,
      processed_at: new Date().toISOString(),
    }).eq("id", inboxId);

    await scheduleOrAggregateBatch(replyTo, numeroFmt, perfil, isGroup, senderName);
  } catch (err) {
    console.error(`processMessage ${inboxId} error:`, err);
    await supa.from("whatsapp_inbox").update({ status: "failed", error: String(err) }).eq("id", inboxId);
    await sendWhatsAppText(replyTo, `❌ Erro processando: ${String(err).substring(0, 200)}`);
  }
}

async function scheduleOrAggregateBatch(replyTo: string, numeroFmt: string, perfil: any, isGroup: boolean, senderName: string) {
  await new Promise(r => setTimeout(r, BUFFER_SECONDS * 1000));

  const query = supa.from("whatsapp_inbox").select("*")
    .in("status", ["transcribed", "pending"])
    .is("batch_id", null)
    .order("received_at", { ascending: true });

  const { data: msgs } = isGroup
    ? await query.eq("twilio_to", replyTo)
    : await query.eq("twilio_from", numeroFmt);

  if (!msgs || msgs.length === 0) return;

  const batchId = Date.now();
  const ids = msgs.map((m: any) => m.id);
  await supa.from("whatsapp_inbox").update({ batch_id: batchId, status: "batched" }).in("id", ids);

  const textoCompleto = msgs.map((m: any) => {
    const prefix = isGroup ? `[${m.sender_name || "?"}]: ` : "";
    return prefix + ((m.body ? m.body + " " : "") + (m.transcribed_text || "")).trim();
  }).filter(Boolean).join("\n").trim();

  const todasFotos: string[] = [];
  msgs.forEach((m: any) => { if (Array.isArray(m.stored_photo_paths)) todasFotos.push(...m.stored_photo_paths); });

  const rdoJson = await chamarClaudeParaRdo(textoCompleto, todasFotos.length, perfil, isGroup);

  const { data: draft } = await supa.from("rdos_drafts").insert({
    origem: "whatsapp_ia",
    twilio_from: replyTo,
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
  }).select().single();

  await supa.from("whatsapp_inbox").update({ rdo_draft_id: draft.id }).in("id", ids);

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
  await sendWhatsAppText(replyTo, resumo);
}

async function chamarClaudeParaRdo(texto: string, numFotos: number, perfil: any, isGroup: boolean): Promise<any> {
  const today = new Date().toISOString().substring(0, 10);
  const systemPrompt = `Você é um assistente que estrutura RDOs para obra BTR 2 casas em Sen. Canedo/GO da Olive Tree.

ETAPAS: 1=Serv Prelim, 2=Fundações, 3=Estrutura, 4=Alvenaria, 5=Cobertura, 6=Hidráulica, 7=Elétrica, 8=Esquadrias, 9=Rev Internos, 10=Rev Externos, 11=Pisos, 12=Pintura, 13=Louças, 14=Bancadas, 15=Forros, 16=Áreas Externas, 17=Limpeza, 18=Admin, 19=Encargos, 20=Imprevistos. F1=Gesso, F2=Rufos, F3=Marcenaria, F4=Muros Arrimo, F5=Muros Perimetrais, F6=Fossas, F7=Vidraçaria.

RETORNE APENAS JSON: {data, numero_sugerido, clima_manha, clima_tarde, condicao, atividades:[{cod_etapa,etapa_nome,descricao,pct_executado,status,mao_obra_valor,material_valor}], mao_obra_efetivo:[{funcao,profissional,qtd,horas}], material_recebido:[{item,qtd,fornecedor}], ocorrencias:[{tipo,descricao,severidade}], comentario_geral, alertas_para_investidor:[], _confidence:0-1}. Data hoje: ${today}.`;
  const contexto = isGroup
    ? `As mensagens abaixo foram trocadas no grupo WhatsApp RDO-par2b por vários participantes (cada linha começa com [Nome]:). Sintetize um RDO consolidado refletindo o que foi feito hoje.`
    : `${perfil.nome} (${perfil.papel}) enviou via WhatsApp:`;
  const userPrompt = `${contexto}\n\n"${texto}"\n\n${numFotos > 0 ? `[${numFotos} foto(s) anexada(s)]` : ""}\n\nEstruture em JSON. Retorne SOMENTE JSON sem markdown.`;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }),
  });
  if (!resp.ok) throw new Error(`Claude failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  const content = data.content?.[0]?.text || "{}";
  const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try { return JSON.parse(cleaned); } catch { return { _confidence: 0.1, comentario_geral: cleaned, atividades: [] }; }
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", service: "btr-paraiso-ii whatsapp webhook (Z-API)", version: 4, suporte_grupos: true }), {
      headers: { "content-type": "application/json" },
    });
  }
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });

  try {
    const incomingToken = req.headers.get("client-token") || "";
    if (ZAPI_CLIENT_TOKEN && incomingToken && incomingToken !== ZAPI_CLIENT_TOKEN) {
      console.error("Invalid Client-Token");
      return new Response("Invalid token", { status: 403 });
    }
    const payload = await req.json();
    return await handleWebhook(payload);
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal error: " + String(err), { status: 500 });
  }
});
