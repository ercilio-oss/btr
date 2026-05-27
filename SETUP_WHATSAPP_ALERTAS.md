# 📲 Setup Notificações WhatsApp via Zapier

**Quando**: alertas automáticos no seu WhatsApp quando algo crítico acontecer na obra (estouro orçamento, vencimento próximo, RDO novo, ocorrência crítica).

**Pré-requisitos**:
- Conta Zapier (plano Starter US$ 19,99/mês — necessário para multi-step)
- Twilio WhatsApp Sandbox (grátis) OU 360dialog / Z-API (R$ 60-150/mês para WhatsApp Business API oficial)
- Acesso ao mais.ControleERP (para Zaps que monitoram RDOs)

---

## 🎯 5 Zaps prioritários

### **ZAP 1 — Estouro de Orçamento por Etapa**

**Quando**: uma etapa ultrapassa 100% do orçado.

**Trigger**: 
- Schedule by Zapier (a cada 6h)
- Code by Zapier (Python): leitura da planilha (via Google Drive API) e cálculo

**Filter**: `pct_realizado > 1.0`

**Action**: Twilio WhatsApp → enviar para `+55 62 9XXXX-XXXX`

**Mensagem**:
```
🚨 *ALERTA BTR Paraíso II*

⚠️ Etapa em ESTOURO: {{etapa_nome}}
💰 Orçado: R$ {{orcado}}
💸 Realizado: R$ {{realizado}}
📊 Estouro: {{pct}}% (R$ {{excesso}} acima)

Última atualização: {{data}}
👉 Veja: btr-paraiso-ii.netlify.app/apropriacao.html
```

---

### **ZAP 2 — Vencimento de Pagamento Próximo**

**Quando**: pagamento previsto em ≤7 dias.

**Trigger**: Schedule by Zapier (todo dia às 8h)

**Code Step**: Carrega lista de vencimentos da planilha e filtra os próximos 7 dias.

**Action**: WhatsApp

**Mensagem**:
```
📅 *Vencimentos da semana — BTR Paraíso II*

Próximos 7 dias:
{{#each vencimentos}}
• {{data}} — {{descricao}}: R$ {{valor}}
{{/each}}

Total da semana: R$ {{total}}
👉 btr-paraiso-ii.netlify.app/pagamentos.html
```

---

### **ZAP 3 — Novo RDO no mais.ControleERP**

**Quando**: Osias aprova um RDO no mais.ControleERP.

**Opção A — Email Parser** (mais simples):
- mais.ControleERP envia email quando RDO é aprovado → Email Parser do Zapier extrai dados

**Opção B — Webhook** (se mais.ControleERP suportar):
- Configurar webhook do mais.ControleERP apontando para Zapier Catch Hook

**Action 1**: WhatsApp resumo
```
📝 *Novo RDO #{{numero}} aprovado*

📅 {{data}} ({{dia_semana}})
🌤️ {{clima}}
👷 Equipe: {{efetivo}}
🔧 Atividades: {{atividades}}

💬 {{comentario}}

📷 {{n_fotos}} fotos anexadas
👉 Ver: {{url_rdo}}
```

**Action 2**: Adicionar linha na planilha mestra (Google Sheets API)

**Action 3**: Trigger rebuild do site Netlify (webhook deploy)

---

### **ZAP 4 — Ocorrência Crítica**

**Quando**: RDO contém palavras-chave como "acidente", "rachadura", "fiscal", "embargo", "infiltração".

**Trigger**: mesma do Zap 3

**Filter**: Texto do RDO contém palavras críticas

**Action**: WhatsApp URGENTE + email cópia
```
🚨🚨 *OCORRÊNCIA CRÍTICA*

RDO #{{numero}} — {{data}}
Tipo: {{tipo_detectado}}

Descrição: {{descricao}}

Reportado por: {{criado_por}}
👉 Agir AGORA: btr-paraiso-ii.netlify.app/riscos.html
```

---

### **ZAP 5 — Resumo Semanal (segunda 8h)**

**Quando**: Toda segunda-feira às 8h.

**Action**: WhatsApp com resumo da semana passada
```
📊 *Resumo Semanal — BTR Paraíso II*

Semana de {{data_inicio}} a {{data_fim}}

💰 Gasto na semana: R$ {{total_semana}}
📋 {{n_rdos}} RDOs registrados
👷 {{n_diaristas}} diaristas pagos
🏪 {{n_compras}} compras de material

📊 % Físico: {{pct_fisico}}% (era {{pct_anterior}}% semana passada)

⚠️ Alertas:
{{alerts}}

📈 Próx. semana: {{previsao_semana}}

👉 Score Card completo: btr-paraiso-ii.netlify.app/scorecard.html
```

---

## 🔧 Como configurar passo a passo

### Passo 1 — Twilio WhatsApp Sandbox (grátis para testes)

1. Criar conta em [twilio.com](https://twilio.com)
2. Console → Develop → Messaging → Try it out → Send a WhatsApp message
3. Anote: `Account SID`, `Auth Token`, `Twilio Sandbox Number` (algo como `whatsapp:+14155238886`)
4. Do seu celular, envie a mensagem `join <code>` para o número do sandbox
5. Agora você pode receber mensagens via API

### Passo 2 — Criar Zapier Workflow

1. Acesse [zapier.com](https://zapier.com) → Create Zap
2. **Trigger**: Schedule by Zapier → Every Day (hora 8)
3. **Action 1**: Webhooks by Zapier → GET → URL `https://btr-paraiso-ii.netlify.app/assets/data.js`
4. **Action 2**: Code by Zapier (Python) — parseia o JSON e filtra alertas
5. **Action 3**: Filter — só continua se houver alertas
6. **Action 4**: Twilio → Send WhatsApp Message

### Passo 3 — Test e Activate

- Teste cada Zap manualmente
- Ative com `Turn on Zap`
- Monitore no `Zap History` os primeiros dias

---

## 💰 Custo total estimado

| Item | Custo |
|---|---|
| Zapier Starter | US$ 19,99/mês (~R$ 100) |
| Twilio Sandbox | Grátis |
| Twilio WhatsApp Business API | US$ 0,005 por mensagem (1.000 msgs = ~R$ 25) |
| **Total estimado**: | **~R$ 125/mês** |

Para uso real (envio confiável), recomendo migrar do Sandbox para um número oficial via Twilio ou 360dialog (R$ 60-150/mês). 

---

## 🚀 Para começar AGORA (sem código)

1. Quer que eu te ajude a criar a primeira conta Twilio + Zapier?
2. Ou prefere começar só com **alerta por email** (mais simples) e migrar pra WhatsApp depois?
3. Ou conectamos com seu CRM/WhatsApp Business existente?

Me responda e eu te ajudo na configuração ao vivo.
