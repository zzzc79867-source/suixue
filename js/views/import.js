import { el, toast } from '../ui.js';
import { loadIndex, loadSubjects } from '../content.js';
import { getImportedSubjects, addImportedSubject, removeImportedSubject } from '../store.js';

export async function renderImport(container, nav) {
  container.append(el('h1', { style: 'font-size:22px;font-weight:800;margin-bottom:14px' }, '内容导入'));

  const c1 = el('div', { class: 'set-card' });
  c1.append(el('h3', null, '方式一 · 电脑端导入（推荐）'));
  c1.append(el('div', { class: 'explain-text', html:
    '在电脑上把内容整理成 JSON 文件，放进 <b>content/subjects/</b> 目录，并在 <b>content/index.json</b> 里注册该科目，重新部署后手机端自动生效。<br><br>' +
    '本地目录：<b>D:/123/study-app/content/</b><br>' +
    '（后续我会提供一键转换工具，把你发的 PPT / 作业转成卡片 JSON）'
  }));
  container.append(c1);

  const c2 = el('div', { class: 'set-card' });
  c2.append(el('h3', null, '方式二 · 手机直接导入'));
  c2.append(el('div', { class: 'explain-text' }, '支持导入整科 JSON、卡片数组，或单个单元。导入后存在本机，可随时删除。'));
  const upload = el('button', { class: 'upload' }, '📄 选择 JSON 文件导入');
  const fileInput = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
  fileInput.onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const subj = normalizeSubject(data);
      addImportedSubject(subj);
      toast('导入成功：' + subj.name);
      nav.onRefresh();
    } catch (err) { toast('导入失败：' + err.message); }
  };
  upload.onclick = () => fileInput.click();
  c2.append(upload, fileInput);
  c2.append(el('button', { class: 'btn-plain', style: 'margin-top:10px', onclick: downloadTemplate }, '下载模板示例'));
  container.append(c2);

  const c3 = el('div', { class: 'set-card' });
  c3.append(el('h3', null, '当前内容'));
  try {
    const idx = await loadIndex();
    c3.append(el('div', { class: 'set-row' }, [el('span', null, '内容版本'), el('span', { class: 'sub' }, idx.version)]));
    const subjects = await loadSubjects();
    const imported = getImportedSubjects();
    for (const s of subjects) {
      const isImported = imported.some(x => x.id === s.id);
      const total = (s.units || []).reduce((n, u) => n + (u.cards ? u.cards.length : 0), 0);
      const row = el('div', { class: 'set-row' });
      row.append(
        el('span', null, s.icon + ' ' + s.name + (isImported ? '（导入）' : '')),
        el('span', { class: 'sub' }, (s.units || []).length + ' 单元 · ' + total + ' 卡')
      );
      c3.append(row);
      if (isImported) {
        const del = el('button', { class: 'btn-danger', style: 'align-self:flex-end;margin:2px 0 8px', onclick: () => { removeImportedSubject(s.id); toast('已删除'); nav.onRefresh(); } }, '删除此科目');
        c3.append(del);
      }
    }
  } catch (e) { c3.append(el('div', { class: 'empty' }, '内容加载失败')); }
  container.append(c3);
}

function normalizeSubject(data) {
  let units = [], name = '我的导入', icon = '📥', examDate = '';
  if (Array.isArray(data)) {
    units = [{ title: '导入', cards: data }];
  } else if (data && Array.isArray(data.units)) {
    units = data.units; name = data.name || name; icon = data.icon || icon; examDate = data.examDate || '';
  } else if (data && Array.isArray(data.cards)) {
    units = [{ title: '导入', cards: data.cards }]; name = data.name || name; icon = data.icon || icon; examDate = data.examDate || '';
  } else {
    throw new Error('格式不支持：需要 units 数组 / cards 数组 / 卡片数组');
  }
  for (const u of units) {
    for (const c of (u.cards || [])) {
      if (!c || !c.id || !c.type) throw new Error('存在缺少 id 或 type 的卡片');
    }
  }
  return { id: 'imported-' + Date.now(), name, icon, color: '#8b5cf6', examDate, units };
}

function downloadTemplate() {
  const sample = {
    name: '示例科目',
    icon: '📥',
    examDate: '2027-01-15',
    units: [{
      title: '第一章',
      cards: [
        { id: 'x1', type: 'concept', title: '知识点示例', body: '- 要点一\n- 要点二', tag: '第一章' },
        { id: 'x2', type: 'question', stem: '1 + 1 = ?', options: ['1', '2', '3', '4'], answer: 1, explanation: '1+1=2', tag: '第一章' },
        { id: 'x3', type: 'word', front: 'example', back: 'n. 例子' }
      ]
    }]
  };
  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'suixue-template.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
