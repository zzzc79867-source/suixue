import { el, renderBody, esc } from '../ui.js';
import { rateCard, masterCard } from '../srs.js';
import { setMeta, getMeta, getCardState, stampStudy, logSession } from '../store.js';

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
  let session = { teach: 0, ok: 0, no: 0, topics: new Map() };
  const startedAt = Date.now();

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
    const pane = el('div', { class: 'card-pane' });
    const reveal = el('div', { class: 'reveal' });
    const tag = el('div', { class: 'tag' }, subj.icon + ' ' + unit.title);
    const badgeText = item.mode === 'teach' ? '📖 Study Buddy · 新课'
      : item.mode === 'example' ? '🧠 Study Buddy · 例题'
      : item.mode === 'recall' ? '🔄 Study Buddy · 复习'
      : item.mode === 'word' ? '📇 Study Buddy · 单词'
      : '🎯 Study Buddy · 测验';
    const badge = el('div', { class: 'study-badge' }, badgeText);

    if (item.mode === 'teach') {
      pane.append(tag, badge, el('div', { class: 'c-title' }, card.title));
      pane.append(el('div', { class: 'c-body', html: renderBody(card.body) }));
      pane.append(el('div', { class: 'study-tip' }, '学完后用下方 1–5 告诉我掌握程度。'));
    } else if (item.mode === 'recall') {
      pane.append(tag, badge, el('div', { class: 'c-title' }, card.title));
      if (card.type === 'example') {
        pane.append(el('div', { class: 'c-body', html: renderBody(card.body) }));
        reveal.append(el('div', { class: 'c-title', style: 'font-size:17px' }, '💡 解答'));
        reveal.append(el('div', { class: 'c-body', html: renderBody(card.solution || '') }));
      } else {
      pane.append(el('div', { class: 'study-tip' }, '先回忆内容，再点卡片或「显示答案」核对。'));
        reveal.append(el('div', { class: 'c-title', style: 'font-size:18px' }, card.title));
        reveal.append(el('div', { class: 'c-body', html: renderBody(card.body) }));
      }
    } else if (item.mode === 'example') {
      pane.append(tag, badge, el('div', { class: 'ex-badge' }, '例题'));
      pane.append(el('div', { class: 'c-title', style: 'font-size:19px' }, card.title));
      pane.append(el('div', { class: 'c-body', html: renderBody(card.body) }));
      pane.append(el('div', { class: 'study-tip' }, '先自己列思路，再点卡片或「显示解答」核对。'));
      reveal.append(el('div', { class: 'c-title', style: 'font-size:17px' }, '💡 解答'));
      reveal.append(el('div', { class: 'c-body', html: renderBody(card.solution || '（暂无解答）') }));
    } else if (item.mode === 'word') {
      pane.append(tag, badge, el('div', { class: 'w-word' }, card.front));
      if (card.phonetic) pane.append(el('div', { class: 'w-phon' }, card.phonetic));
      const speakBtn = el('button', { class: 'speak', onclick: (e) => { e.stopPropagation(); speakWord(card.front); } }, '🔊 朗读');
      pane.append(speakBtn);
      pane.append(el('div', { class: 'study-tip' }, '先回忆意思，再点卡片看答案。'));
      reveal.append(el('div', { class: 'w-meaning' }, card.back));
      if (card.example) reveal.append(el('div', { class: 'w-example' }, card.example));
      if (card.exampleZh) reveal.append(el('div', { class: 'w-exzh' }, card.exampleZh));
      speakWord(card.front);
    } else { // question
      pane.append(tag, badge, el('div', { class: 'q-stem' }, card.stem));
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
      pane.append(opts, expl);
    }

    if (reveal.childNodes.length) pane.append(reveal);
    cardEl.append(pane);
    deck.append(cardEl);

    renderActions();
    attachGesture(cardEl, pane, item.mode);

    function renderActions() {
      actions.innerHTML = '';
      const revealed = pane.classList.contains('revealed');
      if (item.mode === 'example' || item.mode === 'recall' || item.mode === 'word') {
        if (!revealed) {
          actions.append(actBtn(
            item.mode === 'example' ? '显示解答' : (item.mode === 'word' ? '显示释义' : '显示答案'),
            'next',
            revealPane
          ));
        } else {
          appendRating(actions);
        }
      } else if (item.mode === 'teach') {
        appendRating(actions);
      } else {
        if (!answered) actions.append(el('div', { class: 'empty', style: 'color:#6b665c;padding:12px' }, '点击上方选项作答'));
        else actions.append(actBtn('下一题', 'next', () => answer(ok ? 4 : 1)));
      }
    }

    function revealPane() {
      pane.classList.add('revealed');
      pane.scrollTop = pane.scrollHeight;
      renderActions();
    }
  }

  function appendRating(actions) {
    const row = el('div', { class: 'rate-row' });
    [
      ['1', '没懂', '😰'],
      ['2', '很难', '😓'],
      ['3', '一般', '🤔'],
      ['4', '会了', '😊'],
      ['5', '太简单', '🔥']
    ].forEach(([rating, label, icon]) => {
      row.append(el('button', { class: 'rate-btn', onclick: () => answer(Number(rating)) }, [
        el('span', { class: 'rate-icon' }, icon),
        el('span', { class: 'rate-label' }, label)
      ]));
    });
    actions.append(row);
  }

  function actBtn(label, kind, fn) {
    const b = el('button', { class: 'act small ' + kind, onclick: fn });
    b.style.fontSize = '14px';
    b.style.fontWeight = '700';
    b.textContent = label;
    return b;
  }

  function answer(rating) {
    const item = items[idx];
    const card = item.card;
    const unit = item.unit, subj = item.subject;
    const level = Math.max(1, Math.min(5, Number(rating) || 1));
    if (item.mode === 'word') {
      const st = getCardState(card.id);
      if (level === 5 && st.seen === 0) masterCard(card.id);
      else rateCard(card.id, level);
    } else {
      rateCard(card.id, level);
    }
    bumpToday();
    if (item.mode === 'teach') session.teach++;
    if (level >= 3) session.ok++; else session.no++;
    const topicKey = subj.id + ':' + unit.title;
    const topic = session.topics.get(topicKey) || { icon: subj.icon, subject: subj.name, title: unit.title, total: 0, good: 0, hard: 0 };
    topic.total++;
    if (level >= 3) topic.good++;
    if (level <= 2) topic.hard++;
    session.topics.set(topicKey, topic);
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

  function attachGesture(cardEl, pane, mode) {
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
      if (!moved) {
        pane.classList.toggle('revealed');
        renderActions();
      }
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
    const topicList = [...session.topics.values()]
      .sort((a, b) => (b.hard / Math.max(1, b.total)) - (a.hard / Math.max(1, a.total)))
      .slice(0, 3);
    const accuracy = (session.ok + session.no) ? Math.round(session.ok * 100 / (session.ok + session.no)) : 0;
    wrap.append(
      el('div', { class: 'big' }, session.ok >= session.no ? '🎉' : '💪'),
      el('h2', null, '今日学习完成'),
      el('p', null, '新课 ' + session.teach + ' · 掌握 ' + session.ok + ' · 待巩固 ' + session.no),
      el('p', { class: 'session-diagnosis' }, 'Study Buddy 诊断：正确率 ' + accuracy + '%' + (topicList.length ? '；先巩固 ' + topicList[0].title : '；继续保持当前节奏')),
    );
    if (topicList.length) {
      const topicsBox = el('div', { class: 'summary-topics' });
      topicList.forEach(topic => {
        topicsBox.append(el('div', { class: 'summary-topic' }, [
          el('span', null, topic.icon + ' ' + topic.title),
          el('b', null, topic.good + '/' + topic.total)
        ]));
      });
      wrap.append(topicsBox);
    }
    wrap.append(
      el('button', { class: 'big-btn', onclick: close }, '完成打卡'),
    );
    deck.append(wrap);
    logSession({
      type: 'study',
      cards: items.length,
      correct: session.ok,
      wrong: session.no,
      minutes: Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    });
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
