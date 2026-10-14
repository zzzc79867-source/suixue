import { el, toast } from '../ui.js';
import { loadSubjects } from '../content.js';
import { buildDailyQueue, getWeakTopics, studyStats, achievements } from '../planning.js';
import { getMeta, getHistory } from '../store.js';
import { fmtDate, dayLeft } from '../srs.js';
import { openStudy } from './study.js';

function heatGrid(hist) {
  const grid = el('div', { class: 'heat' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cols = 12, rows = 7;
  for (let c = cols - 1; c >= 0; c--) {
    const col = el('div', { class: 'heat-col' });
    for (let r = 0; r < rows; r++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (c * 7 + r));
      const key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
      const n = hist[key] || 0;
      col.append(el('div', { class: 'heat-cell' + (n > 0 ? ' lv' + Math.min(n, 4) : ''), title: key + ' · ' + n + ' 张' }));
    }
    grid.append(col);
  }
  return grid;
}

function todayKeyStr() {
  const n = new Date();
  return n.getFullYear() + '-' + n.getMonth() + '-' + n.getDate();
}

export async function renderHome(container, nav) {
  const subjects = await loadSubjects();

  const hour = new Date().getHours();
  const greet = hour < 5 ? '夜深了' : hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const streak = getMeta('streak', 0);
  const tk = todayKeyStr();
  const checkedIn = getMeta('lastStudy', '') === tk;
  const todayDone = getMeta('todayKey', '') === tk ? getMeta('todayDone', 0) : 0;

  const { teach, practice } = buildDailyQueue(subjects);
  const totalToday = teach.length + practice.length;
  const stats = studyStats(subjects);
  const weakTopics = getWeakTopics(subjects, 3);

  // 顶部
  const top = el('div', { class: 'topbar' });
  top.append(
    el('div', null, [el('h1', null, greet), el('div', { class: 'sub' }, '今天也来学一点吧')]),
    el('div', { class: 'streak' }, '🔥 ' + streak + ' 天')
  );
  container.append(top);

  // 打卡大卡 + 唯一入口
  const card = el('div', { class: 'grad checkin' });
  card.append(
    el('div', { class: 'checkin-top' }, [
      el('span', { class: 'checkin-pill' }, checkedIn ? '✅ 今日已打卡' : '📌 今日未打卡'),
      el('span', { class: 'checkin-pill' }, '已完成 ' + todayDone + ' 张'),
    ]),
    el('h2', null, checkedIn ? '继续加油，巩固一下' : '开始今天的学习'),
    el('div', { class: 'countdown', html: '今日任务 <b>' + totalToday + '</b> 张 · 新课 <b>' + teach.length + '</b> · 练习复习 <b>' + practice.length + '</b>' }),
  );
  card.append(el('button', { class: 'start-btn', onclick: startLearning }, '▶ 开始学习'));
  container.append(card);

  // 学习热力图
  const heatCard = el('div', { class: 'grad heat-card', style: 'margin-top:14px' });
  heatCard.append(
    el('h2', null, '🔥 学习热力图'),
    el('div', { class: 'countdown', html: '最近 12 周打卡情况' }),
    heatGrid(getHistory())
  );
  container.append(heatCard);

  // Study Buddy 风格：数据驱动的今日建议
  const adviceCard = el('div', { class: 'grad', style: 'margin-top:14px' });
  adviceCard.append(el('h2', null, '🎯 今日建议'));
  if (weakTopics.length) {
    adviceCard.append(el('div', { class: 'countdown', html:
      '先处理薄弱点：<b>' + weakTopics.map(x => x.unit.title.replace(/^第/, '')).join('</b>、<b>') + '</b>'
    }));
  } else if (practice.length) {
    adviceCard.append(el('div', { class: 'countdown', html: '先做 <b>' + practice.length + '</b> 张练习/复习，再进入新知识。' }));
  } else if (teach.length) {
    adviceCard.append(el('div', { class: 'countdown', html: '今天以新知识为主，共 <b>' + teach.length + '</b> 张概念卡。' }));
  } else {
    adviceCard.append(el('div', { class: 'countdown' }, '任务已完成，可以做一页错题或休息。'));
  }
  container.append(adviceCard);

  // Study Buddy 风格：弱项追踪
  const weakCard = el('div', { class: 'grad', style: 'margin-top:14px' });
  weakCard.append(el('h2', null, '🩺 薄弱点'));
  if (!weakTopics.length) {
    weakCard.append(el('div', { class: 'countdown' }, '暂无明显弱项；继续学习会自动生成。'));
  } else {
    weakTopics.forEach(topic => {
      weakCard.append(el('div', { class: 'list-item' }, [
        el('div', { class: 'ic' }, topic.subject.icon),
        el('div', { class: 'meta' }, [
          el('b', null, topic.unit.title),
          el('span', null, topic.subject.name + ' · 弱项分 ' + topic.score)
        ]),
        el('div', { class: 'badge due' }, topic.cards.length + ' 卡')
      ]));
    });
  }
  container.append(weakCard);

  // Study Buddy 风格：学习仪表盘与成就
  const statsCard = el('div', { class: 'grad', style: 'margin-top:14px' });
  statsCard.append(el('h2', null, '📊 学习仪表盘'));
  statsCard.append(el('div', { class: 'countdown', html:
    '已学 <b>' + stats.seen + '</b> 张 · 掌握 <b>' + stats.mastered + '</b> 张 · 正确率 <b>' + stats.accuracy + '%</b>'
  }));
  const badges = el('div', { class: 'badge-row' });
  for (const item of achievements(subjects)) {
    badges.append(el('span', { class: 'badge ' + (item.got ? 'ok' : '') }, item.icon + ' ' + item.label));
  }
  statsCard.append(badges);
  container.append(statsCard);

  // 最近考试
  let nearest = null;
  for (const s of subjects) {
    if (s.examDate) {
      const d = dayLeft(s.examDate);
      if (!nearest || d < nearest.days) nearest = { s, days: d };
    }
  }
  if (nearest) {
    const g = el('div', { class: 'grad', style: 'margin-top:14px' });
    g.append(
      el('h2', null, nearest.s.icon + ' ' + nearest.s.name + ' · 考试'),
      el('div', { class: 'countdown', html: '还有 <b>' + nearest.days + '</b> 天 · ' + fmtDate(nearest.s.examDate) })
    );
    container.append(g);
  }

  // 今日课表（只读）
  const sec = el('div', { class: 'sec' });
  sec.append(el('div', { class: 'sec-head' }, [el('h2', null, '今日课表'), el('span', null, '系统自动分配')]));
  if (!totalToday) {
    sec.append(el('div', { class: 'empty' }, '今天没有新任务，已全部完成 🎉'));
  } else {
    for (const s of subjects) {
      const t = teach.filter(x => x.subject.id === s.id).length;
      const p = practice.filter(x => x.subject.id === s.id).length;
      if (t + p === 0) continue;
      const item = el('div', { class: 'list-item' });
      item.append(
        el('div', { class: 'ic' }, s.icon),
        el('div', { class: 'meta' }, [el('b', null, s.name), el('span', null, '新课 ' + t + ' · 练习/复习 ' + p)]),
        el('div', { class: 'badge ' + (t > 0 ? 'new' : 'ok') }, t > 0 ? '含新课' : '复习')
      );
      sec.append(item);
    }
  }
  container.append(sec);

  function startLearning() {
    const q = buildDailyQueue(subjects);
    const items = q.teach.concat(q.practice);
    if (!items.length) { toast('今天没有新任务，休息一下吧 🎉'); return; }
    openStudy(items, q.teach.length, () => nav.onRefresh());
  }
}
