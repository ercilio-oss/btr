# 🤖 Fase 3 — Setup WhatsApp Z-API + Edge Function

**Status:** Edge Function v3 deployada com Z-API. Aguardando credenciais.

---

## 1. URL do webhook (já no ar)

```
https://tfqhgzcziqnmbwkohbja.supabase.co/functions/v1/whatsapp-webhook
```

Esta URL é a que você vai colar no painel do Z-API.

---

## 2. Configurar Z-API

### 2a. Criar conta
1. Entre em [app.z-api.io](https://app.z-api.io)
2. Crie conta com seu email
3. Plano recomendado pra começar: **Plano Mensal** (R$ 99/mês com mensagens ilimitadas)

### 2b. Conectar seu WhatsApp
1. No painel Z-API → **+ Adicionar instância**
2. Dá um nome (ex: `BTR-Paraiso-II`)
3. Vai aparecer um **QR code** na tela
4. No seu celular WhatsApp → ⋮ (3 pontinhos) → **Aparelhos conectados** → **Conectar aparelho** → escaneia o QR
5. Pronto — seu número está conectado ao Z-API

### 2c. Pegar as credenciais
No painel da instância, **anote estes 3 valores**:
- **Instance ID** (algo como `3D4F5A6B7C8D9E0F1A2B3C4D5E6F7G8H`)
- **Token** (algo como `A1B2C3D4E5F6...`)
- **Client-Token** (em Segurança → Token de Segurança/Account Security)

### 2d. Configurar webhook
No painel da instância → menu lateral **Webhooks**:

1. **Ao receber mensagem (on-message-received)**: cole a URL
   ```
   https://tfqhgzcziqnmbwkohbja.supabase.co/functions/v1/whatsapp-webhook
   ```
2. **Notificar enviadas por mim**: ❌ desabilite (já filtramos por `fromMe` no código)
3. Salve

---

## 3. Cadastre os secrets no Supabase

Entre em [Edge Function Secrets](https://supabase.com/dashboard/project/tfqhgzcziqnmbwkohbja/settings/functions) e adicione:

```
ZAPI_INSTANCE_ID=3D4F5A6B7C8D9E0F1A2B3C4D5E6F7G8H
ZAPI_TOKEN=A1B2C3D4E5F6...
ZAPI_CLIENT_TOKEN=Fb1234abcd5678...
```

(os outros 2 que você já cadastrou: `OPENAI_API_KEY` + `ANTHROPIC_API_KEY` continuam valendo)

---

## 4. Cadastrar números autorizados

Roda no SQL Editor do Supabase substituindo pelo SEU número:

```sql
UPDATE perfis
SET whatsapp_numero = '+5562999999999'  -- seu número com +55 e DDD
WHERE email = 'ercilio@olive.inc';
```

Quando o **Osias** criar conta em /login.html, te aviso pra rodar:
```sql
UPDATE perfis
SET whatsapp_numero = '+5562988888888',
    papel = 'mestre',
    nome = 'Osias Neris Rodrigues Santos'
WHERE email = 'osias@email.com';
```

---

## 5. Teste end-to-end

Do seu celular cadastrado, mande pro **seu próprio WhatsApp** (que está conectado ao Z-API):

> Hoje fizemos a impermeabilização do muro de arrimo.
> Equipe Josias + 1 ajudante.
> Material usado: lona preta + Betumax.
> Previsão: pronto sexta.

E anexa 2-3 fotos.

Sequência esperada:
1. **~3s**: bot responde `📥 Recebi 3 mídia(s). Processando...`
2. **~60s** (buffer + Whisper + Claude): bot responde com resumo + link
3. Você abre o link → revisa em /admin-rdos.html → "✅ Aprovar e Criar RDO"

---

## 💰 Custos esperados (1 RDO/dia × 30 dias)

| Item | Custo |
|---|---|
| Z-API Plano Mensal | R$ 99/mês fixo |
| Claude Sonnet 4.6 (~3k tokens) | ~R$ 0,02 por RDO |
| Whisper áudio (~1 min/RDO) | ~R$ 0,03 por RDO |
| Supabase Edge Function (500k invocações grátis) | R$ 0 |
| **Total estimado** | **~R$ 100/mês fixo** |

180 dias de obra: **~R$ 600 total**. Mas o Z-API serve pra qualquer projeto seu — Delivery Mates, Yamaha, etc — então o custo amortiza.

---

## ⚠️ Caveats Z-API

1. **WhatsApp Web**: tecnicamente roda sobre WhatsApp Web. Mantenha o celular conectado à internet (ou Bateria mínima). Se desconectar, o webhook para.
2. **QR code re-pareamento**: A cada ~14 dias o WhatsApp pode pedir re-conexão. Vai no app.z-api.io → escaneia de novo
3. **Risco de ban**: raro mas existe. Evite spam, mande mensagens "naturais"
4. **Webhook IPs**: Z-API envia de IPs variáveis, então sem whitelist (só validamos via Client-Token)

---

## 🛡️ Segurança implementada

- Edge Function valida header `Client-Token` (rejeita requests sem token correto)
- Verifica se número está em `perfis.whatsapp_numero` E papel é dono/engenheiro/mestre
- Ignora mensagens `fromMe: true` (mensagens que você enviou) e `isGroup: true` (grupos)
- Service role key não vaza pro frontend
- Drafts ficam em quarentena até aprovação manual

---

## 🚀 Próximos passos pra você

1. Criar conta Z-API + conectar WhatsApp via QR (5 min)
2. Anotar Instance ID + Token + Client-Token
3. Colar os 3 secrets no Supabase
4. Configurar webhook on-message-received apontando pra Edge Function
5. Rodar SQL pra cadastrar seu número em `perfis`
6. Testar mandando mensagem do seu celular
7. Me avisar se algo não funcionar
