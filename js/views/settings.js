import { el, toast } from '../ui.js';
import { loadIndex } from '../content.js';
import { resetAll, exportData, importData, getMeta } from '../store.js';

function row(k, v) {
  const r = el('div', { class: 'set-row' });
  r.append(el('span', null, k), el('span', { class: 'sub' }, v));
  return r;
}

export async function renderSettings(container, nav) {
  container.append(el('h1', { style: 'font-size:22px;font-weight:800;margin-bottom:14px' }, '我的'));

  let totalLearned = 0;
  try {
    const p = JSON.parse(localStorage.getItem('suixue.progress.v1') || '{}');
    totalLearned = Object.values(p).filter(v => v && v.seen > 0).length;
  } catch (e) {}

  const c1 = el('div', { class: 'set-card' });
  c1.append(el('h3', null, '学习数据'));
  c1.append(row('累计学习卡片', totalLearned + ' 张'), row('连续打卡', getMeta('streak', 0) + ' 天'));
  container.append(c1);

  const c2 = el('div', { class: 'set-card' });
  c2.append(el('h3', null, '备份与恢复'));
  const r1 = el('div', { class: 'set-row' });
  r1.append(el('span', null, '导出数据（JSON）'));
  r1.append(el('button', { class: 'btn-plain', onclick: doExport }, '导出'));
  const r2 = el('div', { class: 'set-row' });
  r2.append(el('span', null, '导入数据'));
  const fileInput = el('input', { type: 'file', accept: 'application/json', style: 'display:none' });
  fileInput.onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { importData(await f.text()); toast('导入成功'); nav.onChange(); }
    catch (err) { toast('导入失败：格式错误'); }
  };
  r2.append(el('button', { class: 'btn-plain', onclick: () => fileInput.click() }, '导入'));
  c2.append(r1, r2, fileInput);
  container.append(c2);

  const c3 = el('div', { class: 'set-card' });
  c3.append(el('h3', null, '其他'));
  const r3 = el('div', { class: 'set-row' });
  r3.append(el('span', null, '清空全部进度'));
  r3.append(el('button', { class: 'btn-danger', onclick: () => { if (confirm('确定清空所有学习进度吗？此操作不可恢复。')) { resetAll(); toast('已清空'); nav.onChange(); } } }, '清空'));
  c3.append(r3);
  container.append(c3);

  try {
    const ver = await loadIndex();
    container.append(el('p', { style: 'text-align:center;color:#94a3b8;font-size:12px;margin-top:8px' }, '内容版本 ' + ver.version));
  } catch (e) {}
}

function doExport() {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'suixue-backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
