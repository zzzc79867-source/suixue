import { renderMath } from './math.js';

// DOM 工具 + 轻量富文本渲染
export function el(tag, attrs, children) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'onclick') n.onclick = attrs[k];
    else if (k === 'html') n.innerHTML = attrs[k];
    else if (k.startsWith('data-')) n.setAttribute(k, attrs[k]);
    else n.setAttribute(k, attrs[k]);
  }
  if (children != null) {
    if (Array.isArray(children)) children.forEach(c => n.append(c));
    else if (typeof children === 'string') n.textContent = children;
    else n.append(children);
  }
  return n;
}
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// 支持 ### 标题 / - 列表 / **加粗** / `公式` 的迷你渲染
export function renderBody(text) {
  const lines = String(text || '').split('\n');
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push(list.outerHTML); list = null; } };
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`(.+?)`/g, (_, formula) => renderMath(formula));
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (line.startsWith('### ')) { closeList(); out.push('<h3>' + inline(line.slice(4)) + '</h3>'); }
    else if (line.startsWith('## ')) { closeList(); out.push('<h3>' + inline(line.slice(3)) + '</h3>'); }
    else if (line.startsWith('- ')) {
      if (!list) list = document.createElement('ul');
      const li = document.createElement('li'); li.innerHTML = inline(line.slice(2)); list.append(li);
    } else { closeList(); out.push('<p>' + inline(line) + '</p>'); }
  }
  closeList();
  return out.join('');
}
export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 1800);
}
