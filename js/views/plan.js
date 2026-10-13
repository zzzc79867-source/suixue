import { el } from '../ui.js';
import { loadSubjects } from '../content.js';
import { subjectStats, getSubjectWeight } from '../planning.js';
import { setWeight, getDailyCap, setDailyCap, getScope, setScope, getChapters, setChapters } from '../store.js';
import { fmtDate } from '../srs.js';

function pill(n, l) {
  return el('div', { class: 'pill' }, [el('div', { class: 'n' }, String(n)), el('div', { class: 'l' }, l)]);
}

export async function renderPlan(container, nav) {
  const subjects = await loadSubjects();
  container.append(el('h1', { style: 'font-size:22px;font-weight:800;margin-bottom:6px' }, '学习计划'));
  container.append(el('p', { style: 'color:#64748b;font-size:13px;margin-bottom:16px' }, '系统按「权重 × 考试倒计时」自动分配每日新课，并叠加间隔复习'));

  const cap = getDailyCap();
  const capCard = el('div', { class: 'set-card' });
  capCard.append(el('h3', null, '⚙️ 每日新卡上限'));
  capCard.append(el('div', { style: 'font-size:13px;color:#64748b;line-height:1.7', html: '每天最多学多少张<b>新卡</b>（复习卡不受此限制）。0 = 不限，按考试倒计时自动分配。' }));
  const capStep = el('div', { class: 'stepper', style: 'margin-top:12px' });
  capStep.append(
    el('span', { class: 'stepper-label' }, cap === 0 ? '不限（按倒计时自动）' : ('每天最多 ' + cap + ' 张新卡')),
    el('button', { class: 'step-btn', onclick: () => { setDailyCap(Math.max(0, cap - 10)); nav.onRefresh(); } }, '−'),
    el('span', { class: 'step-val' }, String(cap)),
    el('button', { class: 'step-btn', onclick: () => { setDailyCap(cap + 10); nav.onRefresh(); } }, '+')
  );
  capCard.append(capStep);
  container.append(capCard);

  for (const s of subjects) {
    const st = subjectStats(s);
    const w = getSubjectWeight(s.id);
    const block = el('div', { class: 'set-card' });
    const head = el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:10px' });
    head.append(
      el('div', { class: 'ic', style: 'font-size:22px' }, s.icon),
      el('div', { style: 'flex:1' }, [
        el('b', null, s.name),
        el('div', { class: 'sub', style: 'font-size:12px;color:#64748b' }, s.examDate ? ('考试 ' + fmtDate(s.examDate) + ' · 剩 ' + st.days + ' 天') : '未设考试日期'),
      ]),
      el('span', { class: 'badge ' + (st.days <= 7 ? 'due' : 'ok') }, st.days <= 7 ? '临近' : '正常')
    );
    block.append(head);
    block.append(el('div', { class: 'plan-day', style: 'margin-bottom:10px' }, [
      pill(st.remainingNew, '未学'),
      pill(st.due, '到期复习'),
      pill(st.newPerDay, '每日新课'),
      pill(st.mastered, '已掌握'),
    ]));
    const step = el('div', { class: 'stepper' });
    step.append(
      el('span', { class: 'stepper-label' }, '权重（越高每日新课越多）'),
      el('button', { class: 'step-btn', onclick: () => { setWeight(s.id, w - 1); nav.onRefresh(); } }, '−'),
      el('span', { class: 'step-val' }, String(w)),
      el('button', { class: 'step-btn', onclick: () => { setWeight(s.id, w + 1); nav.onRefresh(); } }, '+')
    );
    block.append(step);

    const wordCount = (s.units || []).reduce((n, u) => n + (u.cards || []).filter(c => c.type === 'word').length, 0);
    if (wordCount > 0) {
      const scope = getScope()[s.id] || 0;
      const scopeStep = el('div', { class: 'stepper', style: 'margin-top:12px' });
      const label = scope === 0 ? '单词范围：全部 ' + wordCount + ' 词' : ('单词范围：高频前 ' + scope + ' 词');
      scopeStep.append(
        el('span', { class: 'stepper-label' }, label),
        el('button', { class: 'step-btn', onclick: () => { setScope(s.id, Math.max(0, scope - 500)); nav.onRefresh(); } }, '−'),
        el('span', { class: 'step-val' }, scope === 0 ? '全部' : String(scope)),
        el('button', { class: 'step-btn', onclick: () => { setScope(s.id, Math.min(wordCount, scope + 500)); nav.onRefresh(); } }, '+')
      );
      block.append(scopeStep);
    }

    if (s.id === 'wulihua') {
      const chapter = getChapters()[s.id] || 0;
      const chapterStep = el('div', { class: 'stepper', style: 'margin-top:12px' });
      const label = chapter === 0 ? '章节范围：全部' : ('章节范围：上册：前 ' + chapter + ' 章');
      chapterStep.append(
        el('span', { class: 'stepper-label' }, label),
        el('button', { class: 'step-btn', onclick: () => { setChapters(s.id, Math.max(0, chapter - 1)); nav.onRefresh(); } }, '−'),
        el('span', { class: 'step-val' }, chapter === 0 ? '全部' : String(chapter)),
        el('button', { class: 'step-btn', onclick: () => { setChapters(s.id, Math.min(12, chapter + 1)); nav.onRefresh(); } }, '+')
      );
      block.append(chapterStep);
    }

    container.append(block);
  }

  const tip = el('div', { class: 'set-card' });
  tip.append(el('h3', null, '复习机制'));
  tip.append(el('div', { style: 'font-size:13.5px;line-height:1.9;color:#475569', html:
    '📖 新课：先教学，再进入练习<br>' +
    '✅ 认识 / 答对 → 记忆箱升级（1 → 2 → 4 → 7 → 15 天）<br>' +
    '❌ 不认识 / 答错 → 回到第 1 箱，明天再复习<br>' +
    '🏆 连续 5 箱全对 → 标记「已掌握」'
  }));
  container.append(tip);
}
