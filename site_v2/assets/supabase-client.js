/* ============================================================
   BTR Paraíso II — Supabase Client + Auth + Data Loader
   ============================================================ */

// CDN dinâmico (não tem build step)
(async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.4');

  // ============================================================
  // CONFIG (chaves públicas — protegido por RLS no servidor)
  // ============================================================
  const SUPABASE_URL = 'https://tfqhgzcziqnmbwkohbja.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_uWQ1i0YAPMCU2PKXCXCBzg_zjh0B24q';

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  window.supabase = supabase;

  // ============================================================
  // AUTH GUARD — se não logado, redirecionar para /login.html
  // ============================================================
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
  // CARREGAR DADOS DO BANCO → window.DATA (mesmo shape do data.js antigo)
  // ============================================================
  try {
    const [etapas, rdos, atividades, fornecedores, ocorrencias, compliance, cronograma, aquisicao, kpis, config, perfil] = await Promise.all([
      supabase.from('etapas').select('*').order('ordem'),
      supabase.from('rdos').select('*').order('data', { ascending: false }),
      supabase.from('atividades').select('*').order('data', { ascending: false }),
      supabase.from('fornecedores').select('*').order('data', { ascending: false }),
      supabase.from('ocorrencias').select('*').order('data', { ascending: false }),
      supabase.from('compliance').select('*'),
      supabase.from('cronograma_mensal').select('*').order('ordem'),
      supabase.from('aquisicao').select('*'),
      supabase.from('v_kpis').select('*').single(),
      supabase.from('config_obra').select('*'),
      supabase.from('perfis').select('*').eq('id', session.user.id).single()
    ]);

    // KPIs
    const k = kpis.data || {};
    const orcTotal = Number(k.orcamento_total) || 571800;
    const realiz = Number(k.realizado) || 0;
    const pctFisico = orcTotal > 0 ? realiz / orcTotal : 0;

    // Etapas NBR / Fora / Terreno com realizado calculado
    const etapasAll = (etapas.data || []).map(e => {
      const ativsEtapa = (atividades.data || []).filter(a => a.etapa_cod === e.cod);
      const realizado = ativsEtapa.reduce((s, a) => s + Number(a.total || 0), 0);
      return {
        cod: e.cod, nome: e.nome, desc: e.descricao,
        orcado: Number(e.orcado), realizado,
        pct: e.orcado > 0 ? realizado / Number(e.orcado) : 0,
        saldo: Number(e.orcado) - realizado,
        abc: e.abc, status: e.status
      };
    });

    window.DATA = {
      meta: {
        projeto: 'BTR Paraíso II',
        localizacao: 'Senador Canedo/GO',
        n_unidades: 2,
        area_m2: 154.84,
        gerador: 'Supabase Live',
        backend: 'supabase'
      },
      kpis: {
        orcamento_total: orcTotal,
        realizado: realiz,
        saldo: Number(k.saldo) || (orcTotal - realiz),
        pct_fisico: pctFisico,
        custo_unidade: orcTotal / 2,
        custo_m2: orcTotal / 154.84 / 2,
        total_rdos: Number(k.total_rdos) || 0,
        ultimo_rdo: Number(k.ultimo_rdo) || 0,
        ultima_data: k.ultima_data
      },
      etapas_nbr: etapasAll.filter(e => !['F1','F2','F3','F4','F5','F6','F7','T1'].includes(e.cod)),
      itens_fora: etapasAll.filter(e => ['F1','F2','F3','F4','F5','F6','F7'].includes(e.cod)),
      terreno: etapasAll.find(e => e.cod === 'T1'),
      rdos: (rdos.data || []).map(r => ({
        numero: Number(r.numero), data: r.data, dia_semana: r.dia_semana,
        status: r.status, clima_manha: r.clima_manha, cond_manha: r.cond_manha,
        clima_tarde: r.clima_tarde, cond_tarde: r.cond_tarde,
        criado_por: r.criado_por, aprovado_por: r.aprovado_por,
        comentario: r.comentario, fotos: r.fotos_info
      })),
      atividades_log: (atividades.data || []).map(a => ({
        rdo: Number(a.rdo_numero), data: a.data, cod: a.etapa_cod,
        etapa: a.etapa_nome, status: a.status, descricao: a.descricao,
        pct: Number(a.pct), mo: Number(a.mao_obra), material: Number(a.material), total: Number(a.total)
      })),
      mao_obra_log: [],
      ocorrencias: (ocorrencias.data || []).map(o => ({
        rdo: Number(o.rdo_numero), data: o.data, tipo: o.tipo,
        profissional: o.profissional, descricao: o.descricao, severidade: o.severidade
      })),
      cronograma_mensal: (cronograma.data || []).map(c => ({
        mes: c.mes,
        desemb_prev: Number(c.desemb_prev), desemb_real: Number(c.desemb_real),
        acum_prev: Number(c.acum_prev), acum_real: Number(c.acum_real),
        pct_prev: Number(c.pct_previsto), pct_real: Number(c.pct_realizado)
      })),
      compliance: (compliance.data || []).map(c => ({
        categoria: c.categoria, item: c.item, base_legal: c.base_legal,
        obrigatorio: c.obrigatorio, status: c.status, responsavel: c.responsavel || ''
      })),
      fornecedores: (fornecedores.data || []).map(f => ({
        data: f.data, fornecedor: f.nome, descricao: f.descricao,
        etapa: f.etapa_ref, tipo: f.categoria, valor_bruto: Number(f.valor),
        status: f.status_pagamento
      })),
      aquisicao_terreno: aquisicao.data && aquisicao.data[0] ? {
        data: aquisicao.data[0].data_aquisicao,
        vendedor: aquisicao.data[0].vendedor,
        valor: Number(aquisicao.data[0].valor),
        origem: aquisicao.data[0].origem_pagamento
      } : null,
      aggregations: {
        investimento: {
          capex_construcao: orcTotal - 140000,
          capex_terreno: 140000,
          capex_total: orcTotal,
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

// ============================================================
// LOGOUT HELPER (global)
// ============================================================
window.logoutBtr = async () => {
  if (window.supabase) {
    await window.supabase.auth.signOut();
    window.location.href = '/login.html';
  }
};
