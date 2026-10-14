// 本地持久化：进度 / 权重 / 导入的科目 / 元信息
const PKEY = 'suixue.progress.v1';
const MKEY = 'suixue.meta.v1';

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PKEY)) || {}; }
  catch (e) { return {}; }
}
export function saveProgress(p) { localStorage.setItem(PKEY, JSON.stringify(p)); }

export function getCardState(cardId) {
  const p = loadProgress();
  return p[cardId] || { box: 0, seen: 0, correct: 0, wrong: 0, dueAt: 0, lastAt: 0, status: 'new' };
}
export function setCardState(cardId, patch) {
  const p = loadProgress();
  const cur = p[cardId] || { box: 0, seen: 0, correct: 0, wrong: 0, dueAt: 0, lastAt: 0, status: 'new' };
  p[cardId] = Object.assign(cur, patch);
  saveProgress(p);
  return p[cardId];
}

function readMeta() { try { return JSON.parse(localStorage.getItem(MKEY)) || {}; } catch (e) { return {}; } }
function writeMeta(m) { localStorage.setItem(MKEY, JSON.stringify(m)); }

export function getMeta(key, def) {
  const m = readMeta();
  return key in m ? m[key] : def;
}
export function setMeta(key, val) {
  const m = readMeta(); m[key] = val; writeMeta(m);
}

// 学习历史（热力图用）：{ 'YYYY-M-D': 当天完成张数 }
export function stampStudy() {
  const n = new Date();
  const key = n.getFullYear() + '-' + n.getMonth() + '-' + n.getDate();
  const m = readMeta();
  const h = m.history || {};
  h[key] = (h[key] || 0) + 1;
  m.history = h;
  writeMeta(m);
}
export function getHistory() { return getMeta('history', {}); }

// 学习会话日志（Study Buddy 风格，只保留最近 1000 条）
export function logSession(entry) {
  const m = readMeta();
  const sessions = m.sessions || [];
  sessions.unshift({ id: 'session_' + Date.now(), timestamp: new Date().toISOString(), ...entry });
  m.sessions = sessions.slice(0, 1000);
  writeMeta(m);
}
export function getSessions() { return getMeta('sessions', []); }

// 每日新卡上限（0 = 不限，按考试倒计时自动分配）
export function getDailyCap() { return getMeta('dailyCap', 30); }
export function setDailyCap(n) { setMeta('dailyCap', Math.max(0, Number(n) || 0)); }

// 每日新课倍速（1-10），用于考前压缩或假期加速
export function getSpeed() { return getMeta('speed', 3); }
export function setSpeed(n) { setMeta('speed', Math.max(1, Math.min(10, Number(n) || 1))); }

// 学习范围：{ 科目id: 最多学的单词数 }（0 = 全部；只限制 word 卡，不限制讲义/例题）
export function getScope() { return getMeta('scope', { cet4: 1500 }); }
export function setScope(id, n) { const sc = getScope(); sc[id] = Math.max(0, Number(n) || 0); setMeta('scope', sc); }

// 章节范围：{ 科目id: 最多学到第几章 }（0 = 全部）
export function getChapters() { return getMeta('chapters', { wulihua: 6 }); }
export function setChapters(id, n) {
  const ch = getChapters();
  ch[id] = Math.max(0, Math.min(12, Number(n) || 0));
  setMeta('chapters', ch);
}

// 权重（学科优先级，1-10）
export function getWeights() { return getMeta('weights', {}); }
export function setWeight(id, w) {
  const ws = getWeights(); ws[id] = Math.max(1, Math.min(10, Number(w) || 1)); setMeta('weights', ws);
}

// 导入的科目（存在本地，可删除）
export function getImportedSubjects() { return getMeta('importedSubjects', []); }
export function addImportedSubject(subj) {
  const list = getImportedSubjects();
  list.push(subj);
  setMeta('importedSubjects', list);
}
export function removeImportedSubject(id) {
  setMeta('importedSubjects', getImportedSubjects().filter(s => s.id !== id));
}

export function resetAll() {
  localStorage.removeItem(PKEY);
  localStorage.removeItem(MKEY);
}

// 导出 / 导入备份
export function exportData() {
  return JSON.stringify({
    progress: loadProgress(),
    meta: readMeta(),
    exportedAt: new Date().toISOString()
  }, null, 2);
}
export function importData(text) {
  const d = JSON.parse(text);
  if (d.progress) localStorage.setItem(PKEY, JSON.stringify(d.progress));
  if (d.meta) localStorage.setItem(MKEY, JSON.stringify(d.meta));
}
