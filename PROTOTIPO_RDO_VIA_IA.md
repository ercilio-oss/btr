# 🤖 Protótipo: RDO automático via IA

**Objetivo**: Osias envia foto + áudio do dia pelo WhatsApp → IA transcreve e estrutura o RDO automaticamente no formato da planilha + mais.ControleERP.

---

## 🎯 Fluxo proposto

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Osias envia  │ →  │ Zapier capta │ →  │ Anthropic    │ →  │ Planilha +   │
│ msg WhatsApp │    │ msg + fotos  │    │ Claude API   │    │ mais.Cont.   │
│ + fotos +    │    │              │    │ estrutura    │    │ atualizadas  │
│ áudio        │    │              │    │ RDO          │    │ + alertas    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## 🛠️ Stack técnica

| Componente | Tecnologia | Custo |
|---|---|---|
| Recepção WhatsApp | Twilio WhatsApp Business API | R$ 60-150/mês |
| Orquestração | Zapier OR n8n self-hosted | R$ 100/mês ou grátis |
| Transcrição áudio | Anthropic Claude (multimodal) OR OpenAI Whisper | Por uso |
| Análise foto | Claude 3.5 Sonnet (visão) | Por uso |
| Estruturação | Claude 3.5 Sonnet (prompt) | Por uso |
| Persistência | Google Sheets API + mais.ControleERP API | Grátis |

**Custo estimado por RDO**: ~R$ 0,30 (IA) + WhatsApp + Zapier

---

## 📝 Protótipo do Prompt para Claude

```
Você é um assistente que estrutura Relatórios Diários de Obra (RDO) brasileiros para uma obra residencial BTR de 2 casas em Senador Canedo/GO.

CONTEXTO DA OBRA:
- 20 etapas NBR + 7 itens fora do escopo (F1-F7)
- Etapa 1: Serv. Preliminares · Etapa 2: Fundações · Etapa 3: Estrutura · etc
- F4: Muros de arrimo · F5: Muros perimetrais · F6: Fossas · etc

DADOS RECEBIDOS:
- TEXTO (msg do mestre Osias): {{mensagem_whatsapp}}
- TRANSCRIÇÃO ÁUDIO: {{transcricao_audio}}
- FOTOS: {{lista_fotos_com_descricao}}

EXTRAIA E RETORNE em formato JSON ESTRITO:
{
  "data": "YYYY-MM-DD",
  "clima_manha": "Claro|Nublado|Chuvoso",
  "clima_tarde": "Claro|Nublado|Chuvoso",
  "condicao": "Praticável|Impraticável|Parcial",
  "atividades": [
    {
      "cod_etapa": "1|2|3|...|F1|...|F7",
      "etapa_nome": "Nome da etapa",
      "descricao": "O que foi feito no dia",
      "pct_executado": 0.0-1.0,
      "status": "A Iniciar|Em Execução|Concluída"
    }
  ],
  "mao_obra": [
    {"funcao": "Pedreiro|Servente|...", "profissional": "Nome", "qtd": 1}
  ],
  "material_recebido": [
    {"item": "Areia/Cimento/...", "qtd_aprox": "X sacos/m³", "fornecedor": "Nome"}
  ],
  "ocorrencias": [
    {"tipo": "Atraso|Acidente|...", "descricao": "...", "severidade": "Baixa|Média|Alta|Crítica"}
  ],
  "comentario_geral": "Resumo do que aconteceu no dia",
  "alertas_para_investidor": ["lista de pontos que Ercilio deve saber"]
}

REGRAS:
- Identifique etapa pelo contexto (ex: "concretagem da sapata" → Etapa 2)
- Se mencionar "muro de arrimo" → F4
- Se foto mostra parede sendo levantada → Etapa 4 Alvenaria
- Se mencionar "areia chegou" → material_recebido
- Se identificar problema técnico, criar ocorrência
- Para áreas externas (calçada/muro/garagem), use F5
```

---

## 🚀 Implementação em 4 fases

### Fase 1 — MVP texto + foto (1 semana de dev)
- Osias manda só texto + foto
- Claude estrutura
- Output em formato planilha (CSV)
- Ercilio confirma manualmente antes de gravar

### Fase 2 — Transcrição de áudio (1 semana)
- Áudio → Whisper → texto
- Texto + foto → Claude → JSON
- Auto-gravar na planilha

### Fase 3 — Integração mais.ControleERP (2-3 semanas)
- Cria RDO automaticamente no mais.ControleERP via API
- Sincroniza fotos com Timemark

### Fase 4 — Mobile-first interface (1 semana)
- App PWA dedicado para Osias
- 1 botão "Iniciar RDO" → captura foto + grava áudio + envia

---

## 💵 Custos detalhados (1 RDO/dia × 30 dias)

| Item | Por RDO | Por Mês |
|---|---|---|
| Claude Sonnet 3.5 (input ~3k tokens + output ~1k) | R$ 0,06 | R$ 1,80 |
| Claude para visão (5 fotos) | R$ 0,20 | R$ 6,00 |
| Whisper (1 min áudio) | R$ 0,03 | R$ 0,90 |
| Twilio WhatsApp (recebimento) | R$ 0,02 | R$ 0,60 |
| Zapier ops (~50 por RDO) | — | R$ 30,00 |
| **TOTAL** | **R$ 0,31** | **~R$ 40/mês** |

Para 180 dias de obra: ~R$ 240 de custo total. **MUITO barato comparado ao tempo que economiza.**

---

## 🎯 Quer construir?

Posso entregar em 3 níveis:

**Nível 1 — Mock (1 hora)**: Apenas a interface web que simula o RDO via IA, sem backend real. Você cola texto, IA mostra o JSON estruturado.

**Nível 2 — MVP funcional (1 dia)**: Endpoint serverless no Netlify Functions que recebe texto + URL de foto, chama a Claude API, retorna JSON. Sem integração WhatsApp ainda.

**Nível 3 — Produção (1-2 semanas)**: Pipeline completo Twilio → Zapier → Claude → Google Sheets → mais.ControleERP. Inclui validação humana antes de aprovar.

**Recomendação**: começar pelo **Nível 1** (gratuito, 1 hora) para validar a qualidade do output da IA. Se ficar bom, escala pro Nível 2 ou 3.

---

## 📦 O que entrego se você falar "vai"

1. **Página `/rdo-ia.html`** no site: você cola texto, IA estrutura, mostra JSON pronto
2. **Documentação técnica** dos endpoints
3. **Templates de prompt** otimizados para sua obra
4. **Análise de custos** real (após teste com 5-10 RDOs)

Me responda: **"vai com Nível 1"** ou **"vai com Nível 2"** ou **"depois"** que eu construo.
