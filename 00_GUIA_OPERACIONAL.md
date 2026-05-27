# GUIA OPERACIONAL — BTR Paraíso II

**Obra:** Build-to-Rent · 2 unidades · Setor Residencial Paraíso II, Senador Canedo / GO
**Regime:** Empreitada por etapas / mista
**Investidor:** Ercilio Oliveira
**Gestor de Obras:** Osias Neris (via WhatsApp)
**Início do controle:** 18 de maio de 2026

---

## ESTRUTURA DE PASTAS

```
BR PAR2-B-12 Construction/
├── 00_GUIA_OPERACIONAL.md            ← este arquivo
├── 01_RDO_Diario/
│   ├── RDO_Template_Diario.docx      ← modelo formal (para imprimir / assinar)
│   └── RDO_WhatsApp_Modelo.txt       ← modelo enxuto p/ Osias enviar no celular
├── 02_Custos/
│   └── 00_Planilha_Mestra_BTR_Paraiso_II.xlsx   ← arquivo central (8 abas)
├── 03_Cronograma/                    ← (gráficos exportados, milestone trackers)
├── 04_Juridico_Compliance/
│   └── Memorando_Juridico_BTR_Paraiso_II.docx
├── 05_Fotos/                         ← organize por subpasta AAAA-MM-DD
├── 06_Contratos/                     ← um PDF por empreiteiro
├── 07_Relatorios_Investidor/
│   └── Relatorio_Executivo_Mensal_Template.docx
└── 08_Projeto_Aprovado/              ← projeto arquitetônico + alvará originais
```

---

## A PLANILHA MESTRA (coração do sistema)

Arquivo: `02_Custos/00_Planilha_Mestra_BTR_Paraiso_II.xlsx`. Tem 8 abas:

| Aba | Para que serve | Quem preenche |
|---|---|---|
| **00_Capa** | Identificação da obra, áreas, RT, CNO, alvará | Ercilio (preencher 1 vez) |
| **01_RDO_Diario** | Log linha-a-linha dos RDOs diários | Ercilio (ou Claude) — após receber RDO do Osias |
| **02_Custos_CurvaABC** | Orçado × Realizado por etapa, com Curva ABC automática | Ercilio — coluna D (orçado) inicia, coluna F (realizado) atualiza por medição |
| **03_Cronograma_CurvaS** | 12 meses de previsão e realização, com gráfico Curva S | Ercilio — colunas mensais e linha de realizado |
| **04_Dashboard_Executivo** | KPIs do investimento BTR (Cap Rate, Payback, Yield on Cost) — TUDO AUTOMÁTICO | Só os inputs amarelos (aluguel, taxas) |
| **05_Riscos_Ocorrencias** | Matriz de risco + log de ocorrências da obra | Ercilio + Osias |
| **06_Compliance_Juridico** | Checklist com 32 itens jurídicos (CNO, ART, INSS, NRs etc) | Ercilio acompanha mensalmente |
| **07_Fornecedores_Pagamentos** | Cada NF, retenção 11% automática, status pagamento | Ercilio — uma linha por NF |

**Legenda de cores na planilha:**
- 🔵 Azul = entrada manual (você digita)
- ⚫ Preto = fórmula automática (não mexer)
- 🟢 Verde = link entre abas (não mexer)
- 🟡 Fundo amarelo = premissa-chave que precisa ser preenchida

---

## FLUXO DIÁRIO (Ercilio + Osias via WhatsApp)

```
Osias (fim do dia)                          Ercilio (recebe)
─────────────────                           ─────────────
1. Preenche RDO_WhatsApp_Modelo.txt   →     2. Encaminha p/ Claude
2. Envia 3+ fotos                     →     3. Claude registra na planilha mestra
                                            4. Claude alerta se houver risco
                                            5. Claude calcula avanço físico
```

### Checklist diário do RDO (mínimo)
- [ ] Data + dia da semana
- [ ] Clima manhã/tarde + condição (praticável?)
- [ ] Quantos trabalhadores por função
- [ ] O que executou (qual unidade, qual etapa)
- [ ] Material recebido (item + NF)
- [ ] Ocorrências (atraso, falta, acidente, fiscal)
- [ ] 3+ fotos
- [ ] Planejamento D+1

---

## FLUXO SEMANAL

| Dia | Ação |
|---|---|
| Segunda | Revisar planejamento da semana com Osias |
| Quinta | Medição de etapa — atualizar `02_Custos_CurvaABC` coluna F |
| Sexta | Confirmar pagamentos da semana em `07_Fornecedores_Pagamentos` |

---

## FLUXO MENSAL

1. **Dia 1-3:** Fechar mês na planilha (custos, físico, riscos).
2. **Dia 4-5:** Gerar Relatório Executivo (Template em `07_Relatorios_Investidor/`).
3. **Dia 5:** Revisar Compliance (aba 06) — todas pendências resolvidas?
4. **Dia 10:** Recolher INSS retido (GPS) e ISS do mês anterior.

---

## ALERTAS JURÍDICOS PRIORITÁRIOS (Memorando completo em `04_Juridico_Compliance/`)

🚨 **Antes de iniciar / nos primeiros 30 dias:**
1. **CNO** emitida no e-CAC e afixada na obra
2. **ART/RRT** do RT vigente — uma para o projeto, uma para a execução
3. **Vistoria cautelar** dos vizinhos com laudo fotográfico assinado
4. **Contratos de empreitada** padronizados com retenção 11% INSS prevista
5. **Seguro de Risco de Engenharia (EAR)** — R$ 2-5 mil para obra residencial pequena
6. **Formalização do Osias** como MEI/autônomo com contrato escrito (evitar vínculo CLT)

⚠️ **Risco mais comum:** não recolher os 11% de INSS retidos de empreiteiros → multa de 75% + juros Selic + ARO da Receita.

---

## INTEGRAÇÃO COM O SOFTWARE "CONTROLE"

Você comentou que vai usar o software **Controle** para gestão de obras. Recomendações:

- **Não duplicar:** se o Controle já gera RDO digital, use ele como fonte. A planilha mestra fica como "single source of truth" financeira-jurídica.
- **Exportar:** se o Controle exporta CSV de custos, podemos importar mensalmente para a aba 02 da planilha.
- **WhatsApp + Controle:** o ideal é Osias preencher no Controle direto e te mandar o link no WhatsApp.

> Quando você quiser, me envie um print do Controle ou descreva as funcionalidades — posso te ajudar a desenhar o fluxo evitando trabalho dobrado.

---

## COMO ME PEDIR AJUDA

Quando você for me mandar algo, eu já sei o que fazer com cada tipo:

| Você me manda… | Eu faço… |
|---|---|
| "RDO do dia 23/05" + texto do Osias + fotos | Registro na aba 01 da planilha, atualizo % físico, identifico riscos, te respondo um briefing |
| NF de empreiteiro / fornecedor | Calculo retenção 11% INSS, registro na aba 07, atualizo aba 02 |
| Contrato pra revisar | Análise cláusula por cláusula com redline (Memorando seção 5) |
| Foto de problema/rachadura | Avaliação técnica de engenharia + parecer de risco civil |
| "Como está a obra?" | Briefing executivo: % físico, custo realizado, riscos, próximos marcos |
| "Quero relatório do mês para sócio/banco" | Preencho o Relatório Executivo do `07_Relatorios_Investidor/` |
| Notificação de prefeitura/MTE/fisco | Análise jurídica e plano de resposta |

---

*Sistema configurado em 18 de maio de 2026.*
*Atualizações: avise se quiser adicionar abas, integrações ou novos templates.*
