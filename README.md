# BTR Paraíso II — Sistema de Gestão de Obra

Painel privado de gestão da obra **BTR Paraíso II** (2 casas, 154,84m², Senador Canedo/GO) da Olive Tree Soluções Imobiliarias.

## Stack

- **Frontend**: HTML/CSS/JS estático com Chart.js (18 páginas SaaS-style)
- **Backend**: Supabase (Postgres + Auth + Storage)
- **Deploy**: Netlify (auto-deploy a partir desta branch `main`)

## Estrutura

```
site_v2/             ← código publicado pelo Netlify
├── assets/          ← app.js, style.css, supabase-client.js, data.js (fallback)
├── *.html           ← 18 páginas (dashboard, financeiro, RDOs, BTR/ROI, etc)
└── netlify.toml     ← config de build

01_RDO_Diario/       ← templates Word para RDO
03_Cronograma/       ← cronograma físico-financeiro
04_Juridico_Compliance/ ← checklist legal + memorandos
08_Projeto_Aprovado/ ← projeto arquitetônico aprovado

CLAUDE.md            ← instruções do agente Claude
PROTOTIPO_RDO_VIA_IA.md   ← roadmap RDO via WhatsApp + IA
SETUP_WHATSAPP_ALERTAS.md ← Zapier + Twilio para alertas
```

## Pastas privadas (não versionadas)

- `02_Custos/` — planilhas mestras com dados financeiros
- `05_Fotos/` — fotos das obras
- `06_Contratos/` — contratos com fornecedores
- `07_Relatorios_Investidor/` — relatórios executivos

## Variáveis de ambiente (configurar no Netlify)

```
SUPABASE_URL=https://tfqhgzcziqnmbwkohbja.supabase.co
SUPABASE_ANON_KEY=<chave pública anônima>
```

## Comandos úteis

```bash
# Rodar local
cd site_v2 && python3 -m http.server 8080

# Deploy manual (preview)
netlify deploy --dir=site_v2

# Deploy produção
netlify deploy --prod --dir=site_v2
```

---

*Confidencial · Olive Tree Soluções Imobiliarias · CNPJ 57.615.284/0001-48*
