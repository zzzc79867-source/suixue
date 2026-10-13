import { renderHome } from './views/home.js';
import { renderPlan } from './views/plan.js';
import { renderImport } from './views/import.js';
import { renderSettings } from './views/settings.js';

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');

const TABS = [
  { id: 'home', label: '学习', icon: '🏠' },
  { id: 'plan', label: '计划', icon: '🗓️' },
  { id: 'import', label: '导入', icon: '📥' },
  { id: 'me', label: '我的', icon: '⚙️' },
];

let currentTab = 'home';

function renderTabs() {
  tabbar.innerHTML = '';
  for (const t of TABS) {
    const b = document.createElement('button');
    b.className = 'tab' + (currentTab === t.id ? ' on' : '');
    b.innerHTML = '<span class="ic">' + t.icon + '</span><span>' + t.label + '</span>';
    b.onclick = () => { currentTab = t.id; render(); };
    tabbar.appendChild(b);
  }
}

async function render() {
  renderTabs();
  view.innerHTML = '';
  window.scrollTo(0, 0);
  const nav = { onRefresh: render };
  try {
    if (currentTab === 'home') {
      view.innerHTML = '<div class="empty">加载中…</div>';
      await renderHome(view, nav);
    } else if (currentTab === 'plan') {
      view.innerHTML = '<div class="empty">加载中…</div>';
      await renderPlan(view, nav);
    } else if (currentTab === 'import') {
      view.innerHTML = '<div class="empty">加载中…</div>';
      await renderImport(view, nav);
    } else {
      renderSettings(view, { onChange: render });
    }
  } catch (e) {
    view.innerHTML = '<div class="empty">加载失败：' + e.message + '</div>';
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

render();
