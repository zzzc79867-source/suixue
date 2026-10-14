import { el, renderBody, esc } from '../ui.js';
import { schedule, masterCard } from '../srs.js';
import { setMeta, getMeta, getCardState, stampStudy } from '../store.js';

// items: [{ card, unit, subject, mode }]，mode ∈ teach | recall | word | question
export function openStudy(items, teachCount, onDone) {
  if (!items || !items.length) return;

  const stage = el('div', { class: 'study-stage' });

  const top = el('div', { class: 'study-top' });
  const back = el('button', { class: 'back', onclick: close }, '✕');
  const phase = el('div', { class: 'phase' }, '');
  const prog = el('div', { class: 'prog' });
  const progI = el('i');
  prog.append(progI);
  const cnt = el('div', { class: 'cnt' }, '0 / ' + items.length);
  top.append(back, phase, prog, cnt);
  stage.append(top);

  const deck = el('div', { class: 'deck' });
  stage.append(deck);

  const actions = el('div', { class: 'study-actions' });
  stage.append(actions);

  document.body.append(stage);

  let idx = 0;
  let session = { teach: 0, ok: 0, no: 0 };

  function close() { stage.remove(); }

  function show() {
    if (idx >= items.length) { showSummary(); return; }

    // 新课 → 练习 的过渡页
    if (teachCount > 0 && idx === teachCount) {
      deck.innerHTML = '';
      actions.innerHTML = '';
      phase.textContent = '';
      progI.style.width = Math.round(idx / items.length * 100) + '%';
      cnt.textContent = idx + ' / ' + items.length;
      const wrap = el('div', { class: 'session-end' });
      wrap.append(
        el('div', { class: 'big' }, '📖'),
        el('h2', null, '新课学完啦'),
        el('p', null, '接下来进入练习与复习，把刚学的概念巩固一遍'),
        el('button', { class: 'big-btn', onclick: () => { idx++; show(); } }, '开始练习'),
      );
      deck.append(wrap);
      return;
    }

    const item = items[idx];
    const card = item.card, unit = item.unit, subj = item.subject;

    phase.textContent = idx < teachCount ? '新课' : '练习';
    phase.style.color = idx < teachCount ? '#c9a96e' : '#7fb069';
    cnt.textContent = idx + ' / ' + items.length;
    progI.style.width = Math.round(idx / items.length * 100) + '%';
    deck.innerHTML = '';

    let answered = false, ok = false;

    const isConceptLike = item.mode === 'teach' || item.mode === 'recall' || item.mode === 'example';
    const cardEl = el('div', { class: 's-card active' + (isConceptLike ? ' concept-card' : '') });
    const inner = el('div', { class: 'inner' });
    const front = el('div', { class: 'face front' });
    const back = el('div', { class: 'face back' });
    const tag = el('div', { class: 'tag' }, subj.icon + ' ' + unit.title);

    if (item.mode === 'teach') {
      front.append(tag, el('div', { class: 'c-title' }, card.title));
      front.append(el('div', { class: 'c-body', html: renderBody(card.body) }));
    } else if (item.mode === 'recall') {
      front.append(tag, el('div', { class: 'c-title' }, card.title));
      if (card.type === 'example') {
        front.append(el('div', { class: 'c-body', html: renderBody(card.body) }));
        back.append(el('div', { class: 'c-title', style: 'font-size:17px' }, '💡 解答'));
        back.append(el('div', { class: 'c-body', html: renderBody(card.solution || '') }));
      } else {
        front.append(el('div', { class: 'w-hint' }, '先回忆一下内容，再点开核对'));
        back.append(el('div', { class: 'c-title', style: 'font-size:18px' }, card.title));
        back.append(el('div', { class: 'c-body', html: renderBody(card.body) }));
      }
    } else if (item.mode === 'example') {
      front.append(tag, el('div', { class: 'ex-badge' }, '例题'));
      front.append(el('div', { class: 'c-title', style: 'font-size:19px' }, card.title));
      front.append(el('div', { class: 'c-body', html: renderBody(card.body) }));
      front.append(el('div', { class: 'w-hint' }, '先自己想一想，再点开看解答'));
      back.append(el('div', { class: 'c-title', style: 'font-size:17px' }, '💡 解答'));
      back.append(el('div', { class: 'c-body', html: renderBody(card.solution || '（暂无解答）') }));
    } else if (item.mode === 'word') {
      front.append(tag, el('div', { class: 'w-word' }, card.front));
      if (card.phonetic) front.append(el('div', { class: 'w-phon' }, card.phonetic));
      const speakBtn = el('button', { class: 'speak', onclick: (e) => { e.stopPropagation(); speakWord(card.front); } }, '🔊 朗读');
      front.append(speakBtn);
      front.append(el('div', { class: 'w-hint' }, '点卡片看释义 · 左右滑判断'));
      back.append(el('div', { class: 'w-meaning' }, card.back));
      if (card.example) back.append(el('div', { class: 'w-example' }, card.example));
      if (card.exampleZh) back.append(el('div', { class: 'w-exzh' }, card.exampleZh));
      speakWord(card.front);
    } else { // question
      front.append(tag, el('div', { class: 'q-stem' }, card.stem));
      const opts = el('div', { class: 'opts' });
      const expl = el('div', { class: 'explain' });
      card.options.forEach((o, i) => {
        const b = el('button', { class: 'opt' });
        b.innerHTML = '<span class="k">' + 'ABCD'[i] + '</span>' + esc(o);
        b.onclick = () => {
          if (answered) return;
          answered = true;
          if (i === card.answer) { b.classList.add('correct'); ok = true; }
          else { b.classList.add('wrong'); opts.children[card.answer].classList.add('correct'); }
          expl.innerHTML = '<b>解析</b>　' + esc(card.explanation || '（无解析）');
          expl.classList.add('show');
          renderActions();
        };
        opts.append(b);
      });
      front.append(opts, expl);
    }

    inner.append(front, back);
    cardEl.append(inner);
    deck.append(cardEl);

    renderActions();
    attachGesture(cardEl, item.mode);

    function renderActions() {
      actions.innerHTML = '';
      if (item.mode === 'teach' || item.mode === 'example') {
        actions.append(actBtn(item.mode === 'example' ? '没看懂' : '没听懂', 'mid', () => answer(false)));
        actions.append(actBtn('我明白了', 'yes', () => answer(true)));
      } else if (item.mode === 'recall') {
        actions.append(actBtn('忘了', 'no', () => answer(false)));
        actions.append(actBtn('记得', 'yes', () => answer(true)));
      } else if (item.mode === 'word') {
        actions.append(actBtn('不认识', 'no', () => answer(false)));
        actions.append(actBtn('认识', 'yes', () => answer(true)));
      } else {
        if (!answered) actions.append(el('div', { class: 'empty', style: 'color:#6b665c;padding:12px' }, '点击上方选项作答'));
        else actions.append(actBtn('下一题', 'next', () => answer(ok)));
      }
    }
  }

  function actBtn(label, kind, fn) {
    const b = el('button', { class: 'act small ' + kind, onclick: fn });
    b.style.fontSize = '14px';
    b.style.fontWeight = '700';
    b.textContent = label;
    return b;
  }

  function answer(okVal) {
    const item = items[idx];
    const card = item.card;
    if (item.mode === 'word') {
      const st = getCardState(card.id);
      if (okVal && st.seen === 0) masterCard(card.id);
      else schedule(card.id, okVal);
    } else {
      schedule(card.id, okVal);
    }
    bumpToday();
    if (item.mode === 'teach') session.teach++;
    if (okVal) session.ok++; else session.no++;
    idx++;
    show();
  }

  function speakWord(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  function attachGesture(cardEl, mode) {
    let dragging = false, moved = false, sx = 0, sy = 0, dx = 0, dy = 0;
    cardEl.addEventListener('pointerdown', (e) => {
      if (mode === 'question' || mode === 'teach') return;
      dragging = true; moved = false; sx = e.clientX; sy = e.clientY; dx = 0; dy = 0;
      try { cardEl.setPointerCapture(e.pointerId); } catch (err) {}
    });
    cardEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
      cardEl.style.transition = 'none';
      cardEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.06) + 'deg)';
    });
    cardEl.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dx) > 90) {
        const dir = dx > 0 ? 1 : -1;
        cardEl.style.transition = 'transform .3s,opacity .3s';
        cardEl.style.transform = 'translate(' + (dir * 150) + '%,' + dy + 'px) rotate(' + (dir * 28) + 'deg)';
        cardEl.style.opacity = '0';
        setTimeout(() => answer(dir > 0), 240);
        return;
      }
      if (!moved) cardEl.classList.toggle('flip');
      cardEl.style.transition = 'transform .3s';
      cardEl.style.transform = '';
    });
    cardEl.addEventListener('pointercancel', () => {
      dragging = false;
      cardEl.style.transition = 'transform .3s';
      cardEl.style.transform = '';
    });
  }

  function showSummary() {
    deck.innerHTML = '';
    actions.innerHTML = '';
    phase.textContent = '';
    progI.style.width = '100%';
    cnt.textContent = items.length + ' / ' + items.length;
    const wrap = el('div', { class: 'session-end' });
    wrap.append(
      el('div', { class: 'big' }, session.ok >= session.no ? '🎉' : '💪'),
      el('h2', null, '今日学习完成'),
      el('p', null, '新课 ' + session.teach + ' · 掌握 ' + session.ok + ' · 待巩固 ' + session.no),
      el('button', { class: 'big-btn', onclick: close }, '完成打卡'),
    );
    deck.append(wrap);
    if (onDone) onDone();
  }

  function bumpToday() {
    const now = new Date();
    const key = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate();
    const last = getMeta('lastStudy', '');
    const streak = getMeta('streak', 0);
    if (last !== key) {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const yKey = y.getFullYear() + '-' + y.getMonth() + '-' + y.getDate();
      setMeta('streak', last === yKey ? streak + 1 : 1);
      setMeta('lastStudy', key);
    }
    const tKey = getMeta('todayKey', '');
    setMeta('todayDone', tKey === key ? getMeta('todayDone', 0) + 1 : 1);
    setMeta('todayKey', key);
    stampStudy();
  }

  show();
}
