# 🤖 Fase 3 — Setup WhatsApp Business + Edge Function

**Status:** Edge Function deployada. Aguardando credenciais externas.

---

## 1. URL do webhook (já no ar)

```
https://tfqhgzcziqnmbwkohbja.supabase.co/functions/v1/whatsapp-webhook
```

Esta URL é a que você vai colar na configuração da Twilio.

---

## 2. Conta Twilio + WhatsApp Business API

### 2a. Criar conta Twilio

1. Entre em [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Crie conta com seu email (sem cartão ainda — $15 grátis pra começar)
3. No console anote:
   - **Account SID** (formato: AC...)
   - **Auth Token** (clica em "View")

### 2b. Habilitar WhatsApp Business

Opção A — **WhatsApp Sandbox** (5 min, pra testar):
1. Console → Develop → Messaging → Try it out → **Send a WhatsApp message**
2. Anote o número sandbox: `whatsapp:+14155238886`
3. Do seu celular, envie a mensagem `join <code-mostrado>` pra esse número
4. Pronto pra testar! (limita a 72h de janela por usuário)

Opção B — **Número próprio BR** (3-7 dias, produção):
1. Console → Phone Numbers → Buy a Number → filtrar "Brazil" + "SMS, MMS, Voice"
2. Comprar (~US$ 1,15/mês)
3. Messaging → Senders → WhatsApp → "Bring your own number"
4. Submit Meta Business verification (envia documentos OL Tree)
5. Aguardar aprovação Meta (1-7 dias)
6. Anote o número com prefixo: `whatsapp:+5562XXXXXXX`

### 2c. Configurar Webhook

1. Console → Messaging → Settings → **WhatsApp Sandbox Settings** (ou seu número)
2. Em "When a message comes in":
   - **URL**: `https://tfqhgzcziqnmbwkohbja.supabase.co/functions/v1/whatsapp-webhook`
   - **Method**: `HTTP POST`
3. Save

---

## 3. Conta OpenAI (Whisper para transcrição de áudio)

1. Crie conta em [platform.openai.com](https://platform.openai.com)
2. Adicione cartão (compre $5 pra começar)
3. Settings → **API Keys** → Create new secret key
4. **Whisper** custa ~US$ 0,006/min (R$ 0,03/min de áudio)

---

## 4. Conta Anthropic (Claude para estruturar RDO)

1. Você disse que vai criar uma chave dedicada. Entre em [console.anthropic.com](https://console.anthropic.com)
2. **API Keys** → Create Key → name: "BTR Paraíso II"
3. Recomendo configurar limite de gasto mensal (Settings → Limits → US$ 20)
4. **Claude Sonnet** custa ~US$ 0,003 por RDO estruturado

---

## 5. Configurar Secrets no Supabase

Depois de obter todas as credenciais, me passe que eu rodo:

```sql
-- Como dono no Supabase
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  -- ou seu número próprio
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

**OU** você mesmo configura no dashboard:
1. https://supabase.com/dashboard/project/tfqhgzcziqnmbwkohbja/settings/functions
2. Section **Edge Function Secrets** → Add new secret (uma por uma)

---

## 6. Cadastrar números autorizados

No SQL Editor do Supabase, rode (substituindo pelo número real do Osias):

```sql
-- Cadastrar você (já é dono, só adiciona o número)
UPDATE perfis
SET whatsapp_numero = '+5511XXXXXXXXX'  -- com +55 e DDD
WHERE email = 'ercilio@olive.inc';

-- Adicionar Osias (precisa criar conta antes em /login.html)
UPDATE perfis
SET whatsapp_numero = '+556299XXXXXXXX',
    papel = 'mestre'
WHERE email = 'osias@email.com';
```

---

## 7. Teste end-to-end

1. Do seu celular cadastrado, mande pro número Twilio:
   ```
   Hoje fizemos a impermeabilização do muro de arrimo.
   Equipe Josias + 1 ajudante.
   Material usado: lona preta + Betumax.
   Previsão: pronto sexta.
   ```
   E anexe 2-3 fotos.

2. O bot deve responder em ~3s:
   ```
   📥 Recebi 3 mídia(s). Processando...
   ```

3. Após ~60s (buffer + Whisper + Claude):
   ```
   ✅ RDO estruturado!
   📅 Data: 2026-05-28
   📝 Atividades: 1
   📷 Fotos: 3
   ⚠️ Ocorrências: 0

   👉 Revisar e aprovar:
   https://btr-paraiso-ii.netlify.app/admin-rdos.html?draft=123
   ```

4. Você abre o link → revisa → "✅ Aprovar e Criar RDO"
5. RDO #X aparece em `/rdos.html`, fotos em `/galeria.html`, atividades alimentam KPIs

---

## 💰 Custos esperados (1 RDO/dia × 30 dias)

| Item | Custo unitário | Mensal |
|---|---|---|
| Claude Sonnet estruturar (~3k tokens) | US$ 0,003 | R$ 0,50 |
| Whisper áudio (~1 min/RDO) | US$ 0,006 | R$ 0,90 |
| Twilio número BR | — | US$ 1,15 (~R$ 6) |
| Twilio msg in/out (Sandbox grátis, prod ~R$ 0,02/msg × 60) | — | R$ 1,20 |
| Supabase Edge Function (500k invocações grátis) | — | R$ 0 |
| **Total estimado** | | **~R$ 9/mês** |

180 dias de obra: **~R$ 54** de custo total. Comparado com 180 RDOs manuais que tomam 15min cada (45h), o ROI é absurdo.

---

## 🛡️ Segurança

- Edge Function verifica **assinatura HMAC** do Twilio (rejeita requests falsos)
- Verifica se o número está em `perfis.whatsapp_numero` E papel é dono/engenheiro/mestre
- Service role key não vaza pro frontend (só na Edge Function)
- Drafts ficam em quarentena até aprovação manual (você revê antes de virar RDO oficial)

---

## 🚧 Limitações conhecidas v1

1. **Buffer fixo de 60s**: se o Osias demora muito, pode criar 2 RDOs do mesmo dia. Solução futura: detectar "fim" pela mensagem
2. **Sem confirmação intermediária**: se a IA errou etapa, você descobre só ao revisar. Aprovação manual mitiga
3. **Não responde follow-up**: não dá pra mandar "muda a etapa 4 pra F4" — tem que editar manual
4. **Sem retry automático**: se Claude/Whisper falham, marca como failed (você vê em `whatsapp_inbox.status = failed`)

---

## 🚀 Próximos passos para você

1. Crie conta na Twilio + OpenAI + Anthropic (~30 min)
2. Me passa as 5 secrets
3. Eu configuro na Edge Function + crio link com Twilio
4. Testamos juntos com uma mensagem de exemplo
5. Cadastra Osias (depois que ele tiver conta em /login.html)
