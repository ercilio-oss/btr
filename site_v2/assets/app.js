/* ============================================================
   BTR Paraíso II — Shared App Logic
   Sidebar + Topbar injection, formatters, helpers
   ============================================================ */

// ============================================================
// FORMATTERS
// ============================================================
window.fmt = {
  money: v => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
  moneyShort: v => 'R$ ' + ((Number(v)||0)/1000).toFixed(1) + 'k',
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
    { id: 'btr-roi', href: '/btr-roi.html', label: 'BTR / ROI', icon: '📈' },
    { id: 'documentos', href: '/documentos.html', label: 'Documentos', icon: '📂' },
    { id: 'mobile', href: '/mobile.html', label: 'Vista Mobile', icon: '📱' },
    { section: 'ADMIN' },
    { id: 'admin', href: '/admin.html', label: 'Lançar / Editar', icon: '⚙️' },
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

  const sidebar = `<aside class="sidebar">
    <div class="sidebar-brand">
      <a href="/" class="logo">
        <div class="logo-icon">B</div>
        <span>BTR Paraíso II</span>
      </a>
      <div class="project">2 casas · 154,84m² · Sen. Canedo</div>
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
      <div class="breadcrumb">BTR Paraíso II · <strong>${pageTitle}</strong></div>
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
  if (typeof initPage === 'function') initPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', btrBootstrap);
} else {
  btrBootstrap();
}
