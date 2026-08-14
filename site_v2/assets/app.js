/* ============================================================
   BTR Paraíso II — Shared App Logic
   Sidebar + Topbar injection, formatters, helpers
   ============================================================ */

// ============================================================
// FORMATTERS
// ============================================================
window.moedaSimbolo = () => {
  const m = (window.OBRA && window.OBRA.moeda) || 'BRL';
  return m === 'GBP' ? '£' : m === 'EUR' ? '€' : m === 'USD' ? 'US$' : 'R$';
};
window.fmt = {
  money: v => moedaSimbolo() + ' ' + (Number(v) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
  moneyShort: v => moedaSimbolo() + ' ' + ((Number(v)||0)/1000).toFixed(1) + 'k',
  pct: v => ((Number(v)||0)*100).toFixed(1) + '%',
  num: v => (Number(v) || 0).toLocaleString('pt-BR'),
  date: d => {
    if (!d) return '—';
    const dt = (d instanceof Date) ? d : new Date(d);
    return dt.toLocaleDateString('pt-BR');
  },
  diaSemana: d => {
    if (!d) return '';
    const dt = (d instanceof Date) ? d : new Date(d);
    const dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
    return dias[dt.getDay()];
  }
};

// ============================================================
// SIDEBAR + TOPBAR
// ============================================================
function buildLayout() {
  const D = window.DATA;
  const currentPage = (document.body.dataset.page || 'dashboard').toLowerCase();

    const navItems = [
    { section: 'PRINCIPAL' },
    { id: 'dashboard', href: '/', label: 'Dashboard', icon: '📊' },
    { id: 'scorecard', href: '/scorecard.html', label: 'Score Card', icon: '🎯' },
    { id: 'apropriacao', href: '/apropriacao.html', label: 'Apropriação', icon: '📋', count: D.etapas_nbr.length + D.itens_fora.length },
    { id: 'cronograma', href: '/cronograma.html', label: 'Cronograma', icon: '📅' },
    { section: 'FINANCEIRO' },
    { id: 'financeiro', href: '/financeiro.html', label: 'Financeiro', icon: '💰' },
    { id: 'pagamentos', href: '/pagamentos.html', label: 'Pagamentos', icon: '💳' },
    { id: 'cash-flow', href: '/cash-flow.html', label: 'Cash Flow', icon: '📊' },
    { id: 'cone-incerteza', href: '/cone-incerteza.html', label: 'Cone Incerteza', icon: '🎯' },
    { id: 'heatmap', href: '/heatmap.html', label: 'Heatmap Gastos', icon: '🔥' },
    { id: 'fornecedores', href: '/fornecedores.html', label: 'Fornecedores', icon: '🏪', count: D.fornecedores.length },
    { section: 'EXECUÇÃO' },
    { id: 'rdos', href: '/rdos.html', label: 'RDOs', icon: '📝', count: D.rdos.length },
    { id: 'mao-obra', href: '/mao-obra.html', label: 'Mão de Obra', icon: '👷' },
    { id: 'galeria', href: '/galeria.html', label: 'Galeria de Fotos', icon: '📷' },
    { section: 'GESTÃO' },
    { id: 'compliance', href: '/compliance.html', label: 'Compliance', icon: '⚖️', count: D.compliance.length },
    { id: 'riscos', href: '/riscos.html', label: 'Riscos & Ocorrências', icon: '⚠️', count: D.ocorrencias.length, alert: D.ocorrencias.length > 0 },
    { id: 'insights', href: '/insights.html', label: 'Insights', icon: '🔎' },
    { id: 'btr-roi', href: '/btr-roi.html', label: 'BTR / ROI', icon: '📈' },
    { id: 'documentos', href: '/documentos.html', label: 'Documentos', icon: '📂' },
    { id: 'mobile', href: '/mobile.html', label: 'Vista Mobile', icon: '📱' },
    { section: 'ADMIN' },
    { id: 'admin', href: '/admin.html', label: 'Lançar / Editar', icon: '⚙️' },
    { id: 'admin-rdos', href: '/admin-rdos.html', label: 'Revisar RDOs IA', icon: '🤖' },
  ];

  let navHtml = '';
  navItems.forEach(item => {
    if (item.section) {
      navHtml += `<div class="nav-section">${item.section}</div>`;
    } else {
      const active = currentPage === item.id ? 'active' : '';
      const alert = item.alert ? 'alert' : '';
      const countHtml = item.count !== undefined ? `<span class="count">${item.count}</span>` : '';
      navHtml += `<a href="${item.href}" class="nav-link ${active} ${alert}">
        <span class="icon">${item.icon}</span>${item.label}${countHtml}
      </a>`;
    }
  });

  // ---------- switcher de obras ----------
  const obras = window.OBRAS || [];
  const obraAtiva = window.OBRA || null;
  const STATUS_LABEL = { ativa: 'em obra', cotacao: 'em cotação', planejada: 'planejada', encerrada: 'encerrada' };

  const sigla = (obraAtiva && obraAtiva.cod ? obraAtiva.cod : 'B')
    .replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() || 'B';

  const linhaObra = (() => {
    if (!obraAtiva) return '2 casas · 154,84m² · Sen. Canedo';
    const bits = [];
    if (obraAtiva.unidades) bits.push(obraAtiva.unidades > 1 ? obraAtiva.unidades + ' casas' : '1 unidade');
    if (obraAtiva.area_m2) bits.push(Number(obraAtiva.area_m2).toLocaleString('pt-BR') + 'm²');
    if (obraAtiva.fase) bits.push(obraAtiva.fase);
    else if (obraAtiva.status) bits.push(STATUS_LABEL[obraAtiva.status] || obraAtiva.status);
    return bits.join(' · ') || obraAtiva.cod;
  })();

  const switcherHtml = obras.length > 1 ? `<div class="obra-switch">
      <select id="obraSel" aria-label="Trocar de obra">
        ${obras.map(o => `<option value="${o.id}"${obraAtiva && o.id === obraAtiva.id ? ' selected' : ''}>${o.nome} — ${STATUS_LABEL[o.status] || o.status}</option>`).join('')}
      </select>
      <span class="chev">▾</span>
    </div>` : '';

  const sidebar = `<aside class="sidebar">
    <div class="sidebar-brand">
      <a href="/" class="logo">
        <div class="logo-icon">${sigla}</div>
        <span>${obraAtiva ? obraAtiva.nome : 'BTR Paraíso II'}</span>
      </a>
      ${switcherHtml}
      <div class="project">${linhaObra}</div>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-footer">
      Olive Tree Soluções Imobiliarias<br>
      CNPJ 57.615.284/0001-48
    </div>
  </aside>`;

  const pageTitle = navItems.find(i => i.id === currentPage)?.label || 'Dashboard';
  const topbar = `<header class="topbar">
    <div class="topbar-left">
      <div class="breadcrumb">${(D.obra && D.obra.cod) ? D.obra.cod : 'BTR Paraíso II'} · <strong>${pageTitle}</strong></div>
    </div>
    <div class="topbar-right">
      <div class="topbar-stat">Orçado: <strong>${fmt.money(D.kpis.orcamento_total)}</strong></div>
      <div class="topbar-stat">Realizado: <strong class="text-success">${fmt.money(D.kpis.realizado)}</strong></div>
      <div class="topbar-stat">% Físico: <strong>${(D.kpis.pct_fisico*100).toFixed(1)}%</strong></div>
      <a href="https://app.clickup.com/90121749578/v/li/901211229906" target="_blank" class="topbar-btn">🎯 ClickUp</a>
      <div class="user-chip" style="cursor:pointer;" onclick="if(confirm('Sair da conta?')) window.logoutBtr();" title="Clique para sair">
        <div class="user-avatar">${(D.user && D.user.nome ? D.user.nome[0] : (D.user && D.user.email ? D.user.email[0] : 'U')).toUpperCase()}</div>
      </div>
    </div>
  </header>`;

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="app-shell">
      ${sidebar}
      <div class="main">
        ${topbar}
        <div class="content" id="page-content"></div>
      </div>
    </div>
  `);

  // Trocar de obra: guarda no navegador e recarrega
  const sel = document.getElementById('obraSel');
  if (sel) sel.addEventListener('change', e => {
    const id = Number(e.target.value);
    if (window.setObra) window.setObra(id);
  });

  // Move existing body content into #page-content
  const orig = document.getElementById('original-content');
  if (orig) {
    document.getElementById('page-content').innerHTML = orig.innerHTML;
    orig.remove();
  }
}

// ============================================================
// CHART DEFAULTS
// ============================================================
if (window.Chart) {
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#4B5563';
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.legend.labels.font = { size: 12 };
}

// ============================================================
// HELPERS
// ============================================================
window.statusBadge = (status) => {
  if (!status) return '<span class="badge badge-gray">—</span>';
  const s = status.toLowerCase();
  let cls = 'badge-gray';
  if (s.includes('pendente') || s.includes('estouro') || s.includes('atrasad') || s.includes('aberto')) cls = 'badge-red';
  else if (s.includes('andamento') || s.includes('execução') || s.includes('medir') || s.includes('rascunho') || s.includes('a pagar') || s.includes('a iniciar')) cls = 'badge-yellow';
  else if (s.includes('concluí') || s.includes('aprovado') || s.includes('pago') || s.includes('mitigad') || s.includes('finalizad')) cls = 'badge-green';
  else if (s.includes('análise') || s.includes('em tratamento')) cls = 'badge-blue';
  return `<span class="badge ${cls}">${status}</span>`;
};

window.abcBadge = (abc) => {
  if (!abc || abc === '-') return '';
  const map = {'A': 'badge-red', 'B': 'badge-yellow', 'C': 'badge-green'};
  return `<span class="badge ${map[abc] || 'badge-gray'}">${abc}</span>`;
};

window.severidadeBadge = (sev) => {
  if (!sev) return '';
  const s = sev.toLowerCase();
  let cls = 'badge-gray';
  if (s.includes('crític') || s.includes('alta')) cls = 'badge-red';
  else if (s.includes('média')) cls = 'badge-yellow';
  else if (s.includes('baixa')) cls = 'badge-green';
  return `<span class="badge ${cls}">${sev}</span>`;
};

// ============================================================
// INIT — espera DOMContentLoaded + supabase-ready (window.DATA carregada)
// ============================================================
function btrBootstrap() {
  if (!window.DATA) {
    document.addEventListener('supabase-ready', btrBootstrap, { once: true });
    return;
  }
  buildLayout();

  const D = window.DATA;
  const page = (document.body.dataset.page || '').toLowerCase();
  const isAdmin = page.indexOf('admin') === 0;
  const vazia = (D.etapas_nbr || []).length === 0
             && (D.rdos || []).length === 0
             && (D.fornecedores || []).length === 0;

  // Obra recem-cadastrada, ainda sem orcamento nem RDO: nao adianta
  // renderizar graficos de nada. Mostra o que se sabe e o que falta.
  if (vazia && !isAdmin) {
    const o = D.obra || {};
    const campo = (rot, val) => val
      ? `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--gray-100)">
           <span style="min-width:120px;color:var(--gray-500);font-size:13px">${rot}</span>
           <span style="font-size:13px">${val}</span></div>` : '';
    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div class="page-title">${o.nome || 'Obra'}</div>
        <div class="page-subtitle">${o.fase || ''}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Obra ainda sem dados no sistema</div></div>
        <p class="text-small text-muted" style="margin:0 0 14px">
          Esta obra está cadastrada, mas ainda não tem orçamento, etapas nem RDOs carregados.
          Enquanto isso, as telas de análise ficam vazias — é retrato fiel, não erro.
        </p>
        ${campo('Código', o.cod)}
        ${campo('Endereço', o.endereco)}
        ${campo('Tipo', o.tipo)}
        ${campo('Unidades', o.unidades)}
        ${campo('Área', o.area_m2 ? Number(o.area_m2).toLocaleString('pt-BR') + ' m²' : '')}
        ${campo('Moeda', o.moeda)}
        ${campo('Situação', o.status)}
        ${o.observacao ? `<p class="text-small" style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--gray-200);color:var(--gray-600)">${o.observacao}</p>` : ''}
        <p class="text-small text-muted" style="margin-top:14px">
          Para começar a controlar esta obra: cadastrar as etapas do orçamento e lançar o primeiro RDO em
          <a href="/admin.html">Lançar / Editar</a>.
        </p>
      </div>`;
    return;
  }

  try {
    if (typeof initPage === 'function') initPage();
  } catch (err) {
    console.error('[btr] initPage falhou', err);
    const c = document.getElementById('page-content');
    if (c) c.insertAdjacentHTML('afterbegin',
      `<div class="card" style="border-left:4px solid var(--danger)">
         <div class="card-title">Esta tela não conseguiu montar com os dados desta obra</div>
         <p class="text-small text-muted" style="margin:8px 0 0">${err.message}</p>
       </div>`);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', btrBootstrap);
} else {
  btrBootstrap();
}
