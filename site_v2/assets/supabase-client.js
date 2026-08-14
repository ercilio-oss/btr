/* ============================================================
   BTR Paraíso II — Supabase Client + Auth + Data Loader v2
   Mantém compatibilidade com o shape do antigo data.js
   ============================================================ */

(async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.4');

  const SUPABASE_URL = 'https://tfqhgzcziqnmbwkohbja.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_uWQ1i0YAPMCU2PKXCXCBzg_zjh0B24q';

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  window.supabase = supabase;

  // Auth guard
  const { data: { session } } = await supabase.auth.getSession();
  const isLoginPage = window.location.pathname.endsWith('/login.html') || window.location.pathname.endsWith('/signup.html');
  if (!session && !isLoginPage) {
    window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname);
    return;
  }
  if (session && isLoginPage) {
    window.location.href = '/';
    return;
  }
  if (isLoginPage) {
    document.dispatchEvent(new Event('supabase-ready'));
    return;
  }

  // ============================================================
  // OBRAS — lista e obra ativa (persistida no navegador)
  // ============================================================
  const OBRA_KEY = 'btr_obra_id';
  let OBRAS = [], OBRA = null, OBRA_ID = 1;
  try {
    const { data: obrasData } = await supabase.from('obras')
      .select('*').neq('status', 'encerrada').order('id');
    OBRAS = obrasData || [];
    let saved = null;
    try { saved = Number(localStorage.getItem(OBRA_KEY)) || null; } catch (e) {}
    OBRA = OBRAS.find(o => o.id === saved) || OBRAS.find(o => o.id === 1) || OBRAS[0] || null;
    OBRA_ID = OBRA ? OBRA.id : 1;
  } catch (e) {
    console.warn('[btr] nao consegui carregar obras, usando obra 1', e);
  }
  window.OBRAS = OBRAS;
  window.OBRA = OBRA;
  window.OBRA_ID = OBRA_ID;
  window.setObra = function (id) {
    try { localStorage.setItem(OBRA_KEY, String(id)); } catch (e) {}
    window.location.reload();
  };

  // ============================================================
  // CARREGAR TUDO DO BANCO
  // ============================================================
  try {
    const [etapas, rdos, atividades, pagamentos, ocorrencias, compliance, cronograma, aquisicao, config, perfil, maoObra, fornMaster] = await Promise.all([
      supabase.from('etapas').select('*').eq('obra_id', OBRA_ID).order('ordem'),
      supabase.from('rdos').select('*').eq('obra_id', OBRA_ID).order('data', { ascending: false }),
      supabase.from('atividades').select('*').eq('obra_id', OBRA_ID).order('data', { ascending: false }),
      supabase.from('pagamentos').select('*').eq('obra_id', OBRA_ID).order('data', { ascending: false }),
      supabase.from('ocorrencias').select('*').order('data', { ascending: false }),
      supabase.from('compliance').select('*').order('id'),
      supabase.from('cronograma_mensal').select('*').order('ordem'),
      supabase.from('aquisicao').select('*'),
      supabase.from('config_obra').select('*'),
      supabase.from('perfis').select('*').eq('id', session.user.id).single(),
      supabase.from('mao_obra').select('*').order('data', { ascending: false }),
      supabase.from('v_fornecedores_completo').select('*').order('total_pago', { ascending: false })
    ]);
    // Compat: pagamentos antigos eram chamados de "fornecedores"
    const fornecedores = pagamentos;

    // ============================================================
    // CONFIG → meta {}
    // ============================================================
    const cfg = {};
    (config.data || []).forEach(c => { cfg[c.chave] = c.valor; });
    const meta = {
      empreendimento: cfg.empreendimento || 'BTR Paraíso II',
      razao_social: cfg.razao_social || 'Olive Tree Soluções Imobiliarias',
      nome_fantasia: cfg.nome_fantasia || 'Green Olive Construção e Incorporação',
      cnpj: cfg.cnpj_construtora || '57.615.284/0001-48',
      cliente: cfg.cliente || 'Ercilio de Oliveira',
      endereco: cfg.endereco || 'Senador Canedo/GO',
      n_unidades: Number(cfg.n_unidades) || 2,
      area_terreno: Number(cfg.area_terreno) || 309.77,
      area_total: Number(cfg.area_total_m2) || 154.84,
      area_casa_1: Number(cfg.area_casa_1) || 83.7,
      area_casa_2: Number(cfg.area_casa_2) || 72.35,
      investidor: cfg.investidor || 'Ercilio de Oliveira',
      procurador: cfg.procurador || '',
      empreiteiro: cfg.empreiteiro || '',
      rt: cfg.rt || '',
      gestor: cfg.gestor || '',
      data_inicio: cfg.data_inicio || '2026-05-01',
      prazo_alvo_dias: Number(cfg.prazo_alvo_dias) || 180,
      data_entrega: cfg.data_entrega || '2026-10-28',
      prazo_teto_dias: Number(cfg.prazo_teto_dias) || 180,
      cno: cfg.cno || '',
      alvara: cfg.alvara || ''
    };

    // A obra ativa manda no meta. Obra sem data nao inventa data da PAR2-B-12.
    if (OBRA) {
      meta.obra_id   = OBRA.id;
      meta.obra_cod  = OBRA.cod;
      meta.empreendimento = OBRA.nome || meta.empreendimento;
      meta.endereco  = OBRA.endereco || '—';
      meta.moeda     = OBRA.moeda || 'BRL';
      meta.pais      = OBRA.pais || 'BR';
      meta.fase      = OBRA.fase || '';
      meta.status_obra = OBRA.status || '';
      meta.observacao  = OBRA.observacao || '';
      meta.n_unidades  = Number(OBRA.unidades) || (OBRA.id === 1 ? meta.n_unidades : 1);
      meta.area_total  = OBRA.area_m2 !== null && OBRA.area_m2 !== undefined
                          ? Number(OBRA.area_m2)
                          : (OBRA.id === 1 ? meta.area_total : 0);
      meta.data_inicio  = OBRA.data_inicio  || (OBRA.id === 1 ? meta.data_inicio  : null);
      meta.data_entrega = OBRA.data_entrega || (OBRA.id === 1 ? meta.data_entrega : null);
      if (OBRA.id !== 1) {
        meta.area_terreno = 0; meta.area_casa_1 = 0; meta.area_casa_2 = 0;
        meta.empreiteiro = ''; meta.procurador = ''; meta.rt = '';
      }
    }

    // ============================================================
    // KPIs (da view) + cálculos derivados
    // ============================================================
    // Antes vinha da view v_kpis, que somava TODAS as obras. Agora calcula
    // da obra ativa, com o mesmo criterio de antes: orcado inclui o terreno.
    const _sum = (arr, f) => (arr || []).reduce((s, x) => s + (Number(f(x)) || 0), 0);
    const _rdosArr = rdos.data || [];
    const k = {
      orcamento_total: _sum(etapas.data, e => e.orcado),
      realizado: _sum(atividades.data, a => a.total),
      total_rdos: _rdosArr.length,
      ultimo_rdo: _rdosArr.reduce((m, r) => Math.max(m, Number(r.numero) || 0), 0),
      ultima_data: _rdosArr.reduce((m, r) => (!m || r.data > m) ? r.data : m, null)
    };
    k.saldo = k.orcamento_total - k.realizado;
    const orcTotal = Number(k.orcamento_total) || 0;
    const realiz = Number(k.realizado) || 0;
    const pctFisico = orcTotal > 0 ? realiz / orcTotal : 0;

    // ============================================================
    // ETAPAS com realizado real calculado das atividades
    // ============================================================
    const etapasAll = (etapas.data || []).map(e => {
      const ativsEtapa = (atividades.data || []).filter(a => a.etapa_cod === e.cod);
      const realizado = ativsEtapa.reduce((s, a) => s + Number(a.total || 0), 0);
      return {
        cod: e.cod, nome: e.nome, desc: e.descricao,
        orcado: Number(e.orcado), realizado,
        pct: e.orcado > 0 ? realizado / Number(e.orcado) : 0,
        saldo: Number(e.orcado) - realizado,
        abc: e.abc, status: e.status,
        pct_fisico: (e.pct_fisico === null || e.pct_fisico === undefined) ? null : Number(e.pct_fisico),
        pct_data: e.pct_data || null,
        pct_fonte: e.pct_fonte || null
      };
    });

    const etapas_nbr = etapasAll.filter(e => !['F1','F2','F3','F4','F5','F6','F7','T1'].includes(e.cod));
    const itens_fora = etapasAll.filter(e => ['F1','F2','F3','F4','F5','F6','F7'].includes(e.cod));
    const terreno = etapasAll.find(e => e.cod === 'T1');

    // ============================================================
    // AGGREGATIONS — todas as computações que o frontend usa
    // ============================================================
    const ativs = atividades.data || [];

    // tempo: dias decorridos/restantes
    const hoje = new Date();
    const temPrazo = !!(meta.data_inicio && meta.data_entrega);
    const inicio = temPrazo ? new Date(meta.data_inicio) : null;
    const entrega = temPrazo ? new Date(meta.data_entrega) : null;
    const MS = 1000 * 60 * 60 * 24;
    const decorridos = temPrazo ? Math.max(0, Math.floor((hoje - inicio) / MS)) : 0;
    const total = temPrazo ? Math.max(1, Math.floor((entrega - inicio) / MS)) : 0;
    const restantes = temPrazo ? Math.max(0, Math.floor((entrega - hoje) / MS)) : 0;
    const tempo = {
      hoje: hoje.toISOString().substring(0,10),
      inicio: meta.data_inicio,
      entrega: meta.data_entrega,
      decorridos, total, restantes, tem_prazo: temPrazo,
      pct_tempo: total > 0 ? decorridos / total : 0
    };

    // comp_stats: contagem de compliance por status
    const comp_stats = { pendente: 0, andamento: 0, concluido: 0, na: 0 };
    (compliance.data || []).forEach(c => {
      const s = (c.status || '').toLowerCase();
      if (s.includes('andamento')) comp_stats.andamento++;
      else if (s.includes('conclu')) comp_stats.concluido++;
      else if (s === 'n/a' || s.includes('aplica')) comp_stats.na++;
      else comp_stats.pendente++;
    });

    // totais_tipo: soma por categoria
    const totais_tipo = { mo: 0, material: 0, servico: 0, aquisicao: 0 };
    (fornecedores.data || []).forEach(f => {
      const cat = (f.categoria || '').toLowerCase();
      const v = Number(f.valor || 0);
      if (cat.includes('mão') || cat.includes('mao')) totais_tipo.mo += v;
      else if (cat.includes('material')) totais_tipo.material += v;
      else if (cat.includes('serv')) totais_tipo.servico += v;
      else if (cat.includes('aquis')) totais_tipo.aquisicao += v;
    });

    // top_forn: ranking via master (já deduplicado e com totais)
    const top_forn = (fornMaster.data || [])
      .map(f => [f.nome, Number(f.total_pago) || 0])
      .filter(([_, t]) => t > 0)
      .sort((a, b) => b[1] - a[1]);

    // contas: por método de pagamento (extrair da descrição)
    const contas = {};
    (fornecedores.data || []).forEach(f => {
      const desc = (f.descricao || '').toLowerCase();
      let conta = 'Outros';
      if (desc.includes('santander') && desc.includes('pix')) conta = 'PIX Santander';
      else if (desc.includes('santander')) conta = 'PIX Santander';
      else if (desc.includes('bradesco') && desc.includes('cc')) conta = 'CC Bradesco';
      else if (desc.includes('bradesco')) conta = 'CC Bradesco';
      else if (desc.includes('starling')) conta = 'Starling Bank UK';
      contas[conta] = (contas[conta] || 0) + Number(f.valor || 0);
    });

    // n_estouro: quantas etapas estão estouradas
    const n_estouro = etapasAll.filter(e => e.pct > 1 || (e.status || '').toLowerCase().includes('estouro')).length;

    // ============================================================
    // window.DATA — shape idêntico ao data.js antigo
    // ============================================================
    window.DATA = {
      obra: OBRA,
      obras: OBRAS,
      meta,
      kpis: {
        orcamento_total: orcTotal,
        realizado: realiz,
        saldo: Number(k.saldo) || (orcTotal - realiz),
        pct_fisico: pctFisico,
        custo_unidade: orcTotal / meta.n_unidades,
        custo_m2: orcTotal / meta.area_total / meta.n_unidades,
        total_rdos: Number(k.total_rdos) || 0,
        ultimo_rdo: Number(k.ultimo_rdo) || 0,
        ultima_data: k.ultima_data
      },
      etapas_nbr,
      itens_fora,
      terreno,
      rdos: (rdos.data || []).map(r => ({
        numero: Number(r.numero), data: r.data, dia_semana: r.dia_semana,
        status: r.status, clima_manha: r.clima_manha, cond_manha: r.cond_manha,
        clima_tarde: r.clima_tarde, cond_tarde: r.cond_tarde,
        criado_por: r.criado_por, aprovado_por: r.aprovado_por,
        comentario: r.comentario, fotos: r.fotos_info
      })),
      atividades_log: ativs.map(a => ({
        rdo: Number(a.rdo_numero), data: a.data, cod: a.etapa_cod,
        etapa: a.etapa_nome, status: a.status, descricao: a.descricao,
        pct: Number(a.pct), mo: Number(a.mao_obra), material: Number(a.material), total: Number(a.total)
      })),
      mao_obra_log: (maoObra.data || []).map(m => ({
        rdo: Number(m.rdo_numero),
        data: m.data,
        funcao: m.funcao,
        profissional: m.profissional,
        qtd: Number(m.quantidade) || 1,
        horas: Number(m.horas) || 8,
        obs: m.observacao || ''
      })),
      ocorrencias: (ocorrencias.data || []).map(o => ({
        rdo: Number(o.rdo_numero), data: o.data, tipo: o.tipo,
        profissional: o.profissional, descricao: o.descricao, severidade: o.severidade,
        status: o.status, acao: o.acao_mitigacao, responsavel: o.responsavel
      })),
      riscos: [], // alias semântico — riscos = subset crítico de ocorrências
      cronograma_mensal: (cronograma.data || []).map(c => ({
        mes: c.mes,
        desemb_prev: Number(c.desemb_prev), desemb_real: Number(c.desemb_real),
        acum_prev: Number(c.acum_prev), acum_real: Number(c.acum_real),
        pct_prev: Number(c.pct_previsto), pct_real: Number(c.pct_realizado)
      })),
      compliance: (compliance.data || []).map(c => ({
        id: c.id, categoria: c.categoria, item: c.item, base_legal: c.base_legal,
        obrigatorio: c.obrigatorio, status: c.status, responsavel: c.responsavel || '', obs: c.observacao
      })),
      fornecedores: (pagamentos.data || []).map(f => ({
        data: f.data, fornecedor: f.nome, descricao: f.descricao,
        etapa: f.etapa_ref, tipo: f.categoria, valor_bruto: Number(f.valor),
        status: f.status_pagamento, fornecedor_id: f.fornecedor_id
      })),
      // NOVO: Lista master de fornecedores únicos com totais agregados
      fornecedores_master: (fornMaster.data || []).map(f => ({
        id: f.id,
        nome: f.nome,
        nome_fantasia: f.nome_fantasia,
        cnpj_cpf: f.cnpj_cpf,
        tipo_pessoa: f.tipo_pessoa,
        email: f.email,
        telefone: f.telefone,
        whatsapp: f.whatsapp,
        contato_principal: f.contato_principal,
        endereco: f.endereco,
        cidade: f.cidade,
        uf: f.uf,
        cep: f.cep,
        banco: f.banco,
        pix_key: f.pix_key,
        pix_tipo: f.pix_tipo,
        categoria: f.categoria,
        subcategoria: f.subcategoria,
        abc: f.abc,
        avaliacao_geral: Number(f.avaliacao_geral) || null,
        avaliacao_pontualidade: f.avaliacao_pontualidade,
        avaliacao_qualidade: f.avaliacao_qualidade,
        avaliacao_preco: f.avaliacao_preco,
        status: f.status,
        observacao: f.observacao,
        total_pago: Number(f.total_pago) || 0,
        n_pagamentos: Number(f.n_pagamentos) || 0,
        n_contratos: Number(f.n_contratos) || 0,
        ultimo_pagamento: f.ultimo_pagamento,
        primeiro_pagamento: f.primeiro_pagamento
      })),
      aquisicao_terreno: aquisicao.data && aquisicao.data[0] ? {
        cod: 'T1',
        nome: 'Aquisição do Terreno (Lote 12 Qd 61)',
        orcado: Number(aquisicao.data[0].valor),
        realizado: Number(aquisicao.data[0].valor),
        pct: 1,
        fornecedor: aquisicao.data[0].vendedor,
        data: aquisicao.data[0].data_aquisicao,
        forma: aquisicao.data[0].origem_pagamento
      } : null,
      aggregations: {
        tempo,
        comp_stats,
        totais_tipo,
        top_forn,
        contas,
        pct_fisico: pctFisico,
        n_estouro,
        investimento: {
          capex_construcao: orcTotal - 140000,
          capex_terreno: 140000,
          capex_total: orcTotal,
          realizado_construcao: realiz - (totais_tipo.aquisicao || 0),
          realizado_terreno: totais_tipo.aquisicao || 140000,
          realizado_total: realiz
        }
      },
      user: perfil.data || { nome: session.user.email, papel: 'leitor' }
    };

    document.dispatchEvent(new Event('supabase-ready'));
  } catch (err) {
    console.error('[Supabase] Erro carregando dados:', err);
    document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:Inter,sans-serif;"><h1>Erro carregando dados</h1><p>' + err.message + '</p><a href="/login.html">Voltar pro login</a></div>';
  }
})();

window.logoutBtr = async () => {
  if (window.supabase) {
    await window.supabase.auth.signOut();
    window.location.href = '/login.html';
  }
};
