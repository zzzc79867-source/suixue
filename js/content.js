// 内容加载：index.json + subjects/{id}.json + 本地导入科目
import { getImportedSubjects } from './store.js';

const BASE = 'content/';
let _index = null;
const cache = new Map();

export async function loadIndex(force) {
  if (_index && !force) return _index;
  const r = await fetch(BASE + 'index.json', { cache: 'no-store' });
  _index = await r.json();
  return _index;
}

export async function loadSubject(id, force) {
  const imported = getImportedSubjects().find(s => s.id === id);
  if (imported) return imported;
  const idx = await loadIndex(force);
  const sub = idx.subjects.find(s => s.id === id);
  if (!sub) throw new Error('科目不存在: ' + id);
  if (cache.has(id) && !force) return cache.get(id);
  const r = await fetch(BASE + 'subjects/' + sub.file, { cache: 'no-store' });
  const data = await r.json();
  cache.set(id, data);
  return data;
}

// 全部科目 = 内置 + 本地导入
export async function loadSubjects() {
  const idx = await loadIndex();
  const subs = [];
  for (const s of idx.subjects) subs.push(await loadSubject(s.id));
  for (const s of getImportedSubjects()) subs.push(s);
  return subs;
}

export function flatCards(subject) {
  const out = [];
  for (const u of subject.units || []) {
    for (const c of u.cards || []) out.push({ card: c, unit: u });
  }
  return out;
}
export function totalCards(subject) { return flatCards(subject).length; }
