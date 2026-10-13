// 间隔重复调度（SM-2 简化版）
import { getCardState, setCardState } from './store.js';

export const BOX_INTERVALS = [1, 2, 4, 7, 15]; // 天（艾宾浩斯复习间隔）

export function schedule(cardId, ok) {
  const st = getCardState(cardId);
  let box;
  if (ok) box = Math.min(st.box + 1, BOX_INTERVALS.length);
  else box = 1;
  const days = BOX_INTERVALS[Math.max(box - 1, 0)];
  const dueAt = Date.now() + days * 86400000;
  return setCardState(cardId, {
    box, dueAt,
    seen: st.seen + 1,
    correct: st.correct + (ok ? 1 : 0),
    wrong: st.wrong + (ok ? 0 : 1),
    lastAt: Date.now(),
    status: box >= BOX_INTERVALS.length ? 'mastered' : 'learning'
  });
}

// 单词自测筛选：新卡“认识”直接判定为掌握，跳过复习
export function masterCard(cardId) {
  const st = getCardState(cardId);
  return setCardState(cardId, {
    box: BOX_INTERVALS.length, dueAt: 0,
    seen: st.seen + 1, correct: st.correct + 1,
    lastAt: Date.now(), status: 'mastered'
  });
}
export function isDue(st) {
  if (!st || st.status === 'new') return true; // 新卡默认到期
  return st.dueAt <= Date.now();
}
export function dayLeft(examDate) {
  const d = new Date(examDate + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.max(0, Math.round((d - today) / 86400000));
}
export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return (d.getMonth()+1) + '月' + d.getDate() + '日';
}
