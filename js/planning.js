// 计划引擎：学科统计 + 每日任务队列（按权重 + 倒计时分配）
import { flatCards } from './content.js';
import { loadProgress, getWeights, getDailyCap, getScope, getChapters } from './store.js';
import { dayLeft } from './srs.js';

const DEFAULT_WEIGHT = { cet4: 5, wulihua: 4, diangong: 4 };
// 概念卡 + 例题卡都先“教”，再进入练习
const TEACH_TYPES = new Set(['concept', 'example']);

export function getSubjectWeight(id) {
  const w = getWeights();
  return (id in w) ? w[id] : (DEFAULT_WEIGHT[id] != null ? DEFAULT_WEIGHT[id] : 3);
}

function scopedCards(subject) {
  const all = flatCards(subject);
  const chapters = getChapters()[subject.id];
  if (chapters > 0) {
    return all.filter(it => {
      const matched = it.unit.title.match(/第(\d+)章/);
      return !matched || Number(matched[1]) <= chapters;
    });
  }
  const scope = getScope()[subject.id];
  if (!scope) return all;
  const out = [];
  let words = 0;
  for (const it of all) {
    if (it.card.type === 'word') {
      if (words >= scope) continue;
      words++;
    }
    out.push(it);
  }
  return out;
}

export function subjectStats(subject) {
  const cards = scopedCards(subject);
  const p = loadProgress();
  let total = cards.length, learned = 0, mastered = 0, due = 0, remainingNew = 0;
  for (const it of cards) {
    const st = p[it.card.id];
    if (st && st.seen > 0) learned++;
    if (st && st.status === 'mastered') mastered++;
    if (!st || st.status === 'new') remainingNew++;
    else if (st.status !== 'mastered' && st.dueAt <= Date.now()) due++;
  }
  const days = dayLeft(subject.examDate);
  const newPerDay = days > 0 ? Math.ceil(remainingNew / days) : 0;
  return { total, learned, mastered, due, remainingNew, days, newPerDay };
}

// 按权重把「每日新卡上限」分配到各科
function allocateNew(subjects, stats, cap) {
  const slots = [];
  for (const s of subjects) {
    const want = Math.min(stats[s.id].newPerDay, stats[s.id].remainingNew);
    if (want > 0) slots.push({ id: s.id, want, w: getSubjectWeight(s.id) });
  }
  const out = {};
  if (!slots.length) return out;
  const totalWant = slots.reduce((a, x) => a + x.want, 0);
  let budget = cap > 0 ? Math.min(cap, totalWant) : totalWant;
  const totalW = slots.reduce((a, x) => a + x.w, 0);
  for (const x of slots) out[x.id] = Math.max(1, Math.floor(budget * x.w / totalW));
  for (const x of slots) out[x.id] = Math.min(out[x.id], x.want);
  let used = slots.reduce((a, x) => a + out[x.id], 0);
  let left = budget - used;
  while (left > 0) {
    let changed = false;
    for (const x of slots) {
      if (left <= 0) break;
      if (out[x.id] < x.want) { out[x.id]++; left--; changed = true; }
    }
    if (!changed) break;
  }
  return out;
}

// 生成今日学习队列：{ teach: [...新课概念], practice: [...练习/复习] }
export function buildDailyQueue(subjects) {
  const p = loadProgress();
  const teach = [];
  const practice = [];
  const stats = {};

  for (const s of subjects) stats[s.id] = subjectStats(s);

  // 1) 到期复习（按应复习时间先后）
  const reviews = [];
  for (const s of subjects) {
    for (const it of scopedCards(s)) {
      const st = p[it.card.id];
      if (st && st.status !== 'mastered' && st.dueAt > 0 && st.dueAt <= Date.now()) {
        reviews.push({ card: it.card, unit: it.unit, subject: s, mode: TEACH_TYPES.has(it.card.type) ? 'recall' : it.card.type });
      }
    }
  }
  reviews.sort((a, b) => (p[a.card.id].dueAt - p[b.card.id].dueAt));
  for (const r of reviews) practice.push(r);

  // 2) 新课：概念 → 教学；单词/选择 → 练习；每科按权重分配，受「每日上限」约束
  const ordered = [...subjects].sort((a, b) => getSubjectWeight(b.id) - getSubjectWeight(a.id));
  const alloc = allocateNew(ordered, stats, getDailyCap());
  for (const s of ordered) {
    let budget = alloc[s.id] || 0;
    if (budget <= 0) continue;
    for (const it of scopedCards(s)) {
      if (budget <= 0) break;
      const st = p[it.card.id];
      if (st && st.seen > 0) continue;
      budget--;
      const mode = TEACH_TYPES.has(it.card.type) ? 'teach' : it.card.type;
      (mode === 'teach' ? teach : practice).push({ card: it.card, unit: it.unit, subject: s, mode });
    }
  }

  return { teach, practice };
}
