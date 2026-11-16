(function () {
  'use strict';

  var KEY = 'jsc-progress-v1';
  var store = {
    load: function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    save: function (s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  };
  var state = store.load();
  state.done = state.done || {};
  state.quiz = state.quiz || {};
  state.checks = state.checks || {};
  state.collapsed = state.collapsed || {};
  function persist() { store.save(state); }

  // ---------- Данные курса ----------
  var modules = COURSE.modules;
  var lessons = [];
  modules.forEach(function (m, mi) {
    m.num = mi + 1;
    m.lessons.forEach(function (l, li) {
      l.module = m;
      l.num = m.num + '.' + (li + 1);
      l.index = lessons.length;
      lessons.push(l);
    });
  });
  var byId = {};
  lessons.forEach(function (l) { byId[l.id] = l; });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = window.escapeHtml;

  function doneCount() { return lessons.filter(function (l) { return state.done[l.id]; }).length; }
  function nextLesson() {
    for (var i = 0; i < lessons.length; i++) if (!state.done[lessons[i].id]) return lessons[i];
    return null;
  }

  // ---------- Sidebar ----------
  function renderNav(activeId) {
    var next = nextLesson();
    var html = '<a class="nav-home' + (!activeId ? ' active' : '') + '" href="#/">🏠 Главная</a>' +
      '<a class="nav-home' + (activeId === 'reference' ? ' active' : '') + '" href="#/reference">📘 Справочник Node → Java</a>';
    modules.forEach(function (m) {
      var done = m.lessons.filter(function (l) { return state.done[l.id]; }).length;
      html += '<div class="nav-module' + (state.collapsed[m.id] ? ' collapsed' : '') + '" data-mod="' + m.id + '">' +
        '<button class="nav-module-head" type="button"><span>' + m.num + '. ' + esc(m.title) + '</span>' +
        '<span class="nav-module-count">' + done + '/' + m.lessons.length + '</span><span class="chev">▾</span></button><ul class="nav-lessons">';
      m.lessons.forEach(function (l) {
        var st = state.done[l.id] ? 'done' : (next && next.id === l.id ? 'next' : '');
        html += '<li><a href="#/lesson/' + l.id + '" class="' + (l.id === activeId ? 'active' : '') + '">' +
          '<span class="nav-num">' + l.num + '</span><span>' + esc(l.title) + '</span>' +
          '<span class="nav-status ' + st + '">' + (st === 'done' ? '✓' : '') + '</span></a></li>';
      });
      html += '</ul></div>';
    });
    $('#nav').innerHTML = html;
    var active = $('#nav a.active');
    if (active && active.scrollIntoView) {
      var sb = $('#sidebar');
      var r = active.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight) sb.scrollTop += r.top - window.innerHeight / 3;
    }
    updateTopProgress();
  }

  function updateTopProgress() {
    var pct = Math.round(doneCount() / lessons.length * 100);
    $('#top-progress').style.width = pct + '%';
    $('#top-progress-text').textContent = pct + '%';
  }

  $('#nav').addEventListener('click', function (e) {
    var head = e.target.closest('.nav-module-head');
    if (head) {
      var mod = head.parentNode;
      mod.classList.toggle('collapsed');
      state.collapsed[mod.getAttribute('data-mod')] = mod.classList.contains('collapsed');
      persist();
      return;
    }
    if (e.target.closest('a')) document.body.classList.remove('nav-open');
  });

  // ---------- Поиск ----------
  var textIndex = null;
  function buildIndex() {
    textIndex = lessons.map(function (l) {
      var tmp = document.createElement('div');
      tmp.innerHTML = l.body;
      return { lesson: l, text: (l.title + ' ' + tmp.textContent).replace(/\s+/g, ' ') };
    });
  }
  function doSearch(q) {
    q = q.trim();
    if (q.length < 2) { renderNav(currentId()); return; }
    if (!textIndex) buildIndex();
    var ql = q.toLowerCase();
    var res = textIndex.filter(function (x) { return x.text.toLowerCase().indexOf(ql) !== -1; });
    if (!res.length) { $('#nav').innerHTML = '<div class="search-empty">Ничего не найдено по «' + esc(q) + '»</div>'; return; }
    var re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    $('#nav').innerHTML = '<ul class="search-results">' + res.map(function (x) {
      var i = x.text.toLowerCase().indexOf(ql);
      var snip = x.text.slice(Math.max(0, i - 50), i + q.length + 70);
      return '<li><a href="#/lesson/' + x.lesson.id + '"><div class="sr-title">' + x.lesson.num + ' ' + esc(x.lesson.title) + '</div>' +
        '<div class="sr-snippet">…' + esc(snip).replace(re, function (m) { return '<mark>' + m + '</mark>'; }) + '…</div></a></li>';
    }).join('') + '</ul>';
  }
  $('#search').addEventListener('input', function (e) { doSearch(e.target.value); });
  $('#search').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.target.value = ''; doSearch(''); }
  });

  // ---------- Роутинг ----------
  function currentId() {
    var h = location.hash;
    if (h.indexOf('#/lesson/') === 0) return h.slice(9);
    if (h === '#/reference') return 'reference';
    return null;
  }

  function route() {
    var h = location.hash || '#/';
    var content = $('#content');
    $('#search').value = '';
    if (h.indexOf('#/lesson/') === 0 && byId[h.slice(9)]) {
      var l = byId[h.slice(9)];
      state.last = l.id; persist();
      content.innerHTML = renderLesson(l);
      document.title = l.num + ' ' + l.title + ' — Java + Spring';
      initLesson(l);
      renderNav(l.id);
    } else if (h === '#/reference') {
      content.innerHTML = renderReference();
      document.title = 'Справочник — Java + Spring';
      initChecks();
      renderNav('reference');
    } else {
      content.innerHTML = renderHome();
      document.title = 'Java + Spring для Node-разработчика';
      renderNav(null);
    }
    window.scrollTo(0, 0);
  }

  // ---------- Главная ----------
  function renderHome() {
    var dc = doneCount();
    var next = nextLesson();
    var last = state.last && byId[state.last];
    var totalMin = lessons.reduce(function (a, l) { return a + (l.minutes || 0); }, 0);
    var html = '<div class="page"><section class="hero">' +
      '<h1>Java + Spring Boot<br>для Node.js-разработчика</h1>' +
      '<p class="lead">Практический курс перехода с Node.js/Express на Java и Spring. Каждая тема объясняется через то, что ты уже знаешь: ' +
      'event loop, Express-middleware, Promise, npm, Prisma, Jest. Термины — на английском с пояснением, как в реальной работе.</p></section>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + modules.length + '</b><span>модулей</span></div>' +
      '<div class="stat"><b>' + lessons.length + '</b><span>уроков</span></div>' +
      '<div class="stat"><b>~' + Math.round(totalMin / 60) + ' ч</b><span>чистого чтения + практика</span></div>' +
      '<div class="stat"><b>' + dc + '/' + lessons.length + '</b><span>пройдено</span></div></div>';

    if (next) {
      var cont = (last && !state.done[last.id]) ? last : next;
      html += '<div class="continue"><div><small>' + (dc ? 'Продолжить с урока' : 'Начни отсюда') + '</small><br><b>' +
        cont.num + ' ' + esc(cont.title) + '</b></div><a class="btn primary" href="#/lesson/' + cont.id + '">' +
        (dc ? 'Продолжить →' : 'Начать курс →') + '</a></div>';
    } else {
      html += '<div class="continue"><div><b>🎉 Курс пройден полностью!</b><br><small>Финальный проект и справочник останутся под рукой.</small></div>' +
        '<a class="btn" href="#/reference">Открыть справочник</a></div>';
    }

    html += '<h2>Как проходить курс</h2><ol>' +
      '<li><b>Строго по порядку: 1 → 2 → 3 → …</b> Каждый модуль опирается на предыдущие. В навигации следующий урок отмечен зелёным кружком.</li>' +
      '<li><b>Набирай код руками</b> в IntelliJ IDEA, а не копируй — так быстрее привыкнешь к синтаксису и подсказкам IDE.</li>' +
      '<li>В конце урока — <b>практика</b> (сначала реши сам, потом открой решение) и <b>тест</b> для самопроверки.</li>' +
      '<li>Нажми «Отметить урок пройденным» — прогресс сохраняется в браузере.</li>' +
      '<li>Держи открытым <a href="#/reference">справочник Node → Java</a>: там шпаргалки и глоссарий терминов.</li></ol>' +
      '<h2>Программа</h2><div class="module-grid">';

    modules.forEach(function (m) {
      var d = m.lessons.filter(function (l) { return state.done[l.id]; }).length;
      html += '<div class="module-card"><div class="module-card-head"><span class="module-num">' + String(m.num).padStart(2, '0') + '</span>' +
        '<h3>' + esc(m.title) + '</h3><div class="progress"><div class="progress-bar" style="width:' + (d / m.lessons.length * 100) + '%"></div></div></div>' +
        '<p>' + m.description + '</p><ol>';
      m.lessons.forEach(function (l) {
        html += '<li><span class="num">' + l.num + '</span><a href="#/lesson/' + l.id + '">' + esc(l.title) + '</a> ' +
          (state.done[l.id] ? '<span class="ok">✓</span>' : '') + '</li>';
      });
      html += '</ol></div>';
    });
    html += '</div><p class="footer-note">Прогресс хранится в localStorage этого браузера. ' +
      '<a href="#" id="reset-progress">Сбросить прогресс</a></p></div>';
    return html;
  }

  // ---------- Урок ----------
  function renderLesson(l) {
    var m = l.module;
    var prev = lessons[l.index - 1], next = lessons[l.index + 1];
    var html = '<article class="page lesson">' +
      '<div class="crumbs"><a href="#/">Курс</a> / Модуль ' + m.num + ': ' + esc(m.title) + '</div>' +
      '<h1>' + l.num + ' ' + esc(l.title) + '</h1>' +
      '<div class="lesson-meta"><span class="chip">⏱ ~' + (l.minutes || 20) + ' мин</span>' +
      '<span class="chip">Урок ' + (l.index + 1) + ' из ' + lessons.length + '</span>' +
      (state.done[l.id] ? '<span class="chip done">✓ Пройден</span>' : '') + '</div>';

    if (l.goals && l.goals.length) {
      html += '<div class="goals"><h4>После урока ты сможешь</h4><ul>' +
        l.goals.map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ul></div>';
    }
    html += '<div class="lesson-body">' + l.body + '</div>';

    if (l.tasks && l.tasks.length) {
      html += '<h2 class="section-title">🛠 Практика</h2>';
      l.tasks.forEach(function (t, i) {
        html += '<div class="task"><h3>Задача ' + (i + 1) + '. ' + t.title + '</h3>' + t.text +
          (t.solution ? '<details><summary>Показать решение</summary>' + t.solution + '</details>' : '') + '</div>';
      });
    }
    if (l.quiz && l.quiz.length) {
      html += '<h2 class="section-title">✅ Проверь себя</h2><div id="quiz"></div>';
    }

    html += '<div class="lesson-footer"><div class="done-box"><p>' +
      (state.done[l.id] ? 'Урок отмечен как пройденный.' : 'Разобрался с материалом и сделал практику?') + '</p>' +
      '<button class="btn ' + (state.done[l.id] ? '' : 'primary') + '" id="toggle-done">' +
      (state.done[l.id] ? 'Снять отметку' : '✓ Отметить урок пройденным') + '</button></div><nav class="pager">' +
      (prev ? '<a class="prev" href="#/lesson/' + prev.id + '"><small>← Назад</small>' + prev.num + ' ' + esc(prev.title) + '</a>' : '') +
      (next ? '<a class="next" href="#/lesson/' + next.id + '"><small>Дальше →</small>' + next.num + ' ' + esc(next.title) + '</a>' : '') +
      '</nav></div></article>';
    return html;
  }

  function initLesson(l) {
    if (l.quiz && l.quiz.length) renderQuiz(l);
    initChecks();
    $('#toggle-done').addEventListener('click', function () {
      if (state.done[l.id]) delete state.done[l.id];
      else state.done[l.id] = Date.now();
      persist();
      var wasDone = !!state.done[l.id];
      var y = window.scrollY;
      $('#content').innerHTML = renderLesson(l);
      initLesson(l);
      renderNav(l.id);
      window.scrollTo(0, y);
      if (wasDone) {
        var nx = lessons[l.index + 1];
        var box = $('.done-box p');
        if (box) box.innerHTML = nx ? 'Отлично! Следующий урок: <a href="#/lesson/' + nx.id + '">' + nx.num + ' ' + esc(nx.title) + '</a>' : '🎉 Это был последний урок курса!';
      }
    });
  }

  function renderQuiz(l) {
    var root = $('#quiz');
    var answers = {};
    var prev = state.quiz[l.id];
    var html = prev ? '<div class="quiz-score" id="quiz-prev">Прошлый результат: ' + prev.correct + ' из ' + prev.total + '</div>' : '';
    l.quiz.forEach(function (q, qi) {
      html += '<div class="quiz-q" data-q="' + qi + '"><p>' + (qi + 1) + '. ' + q.q + '</p><div class="quiz-opts">' +
        q.options.map(function (o, oi) { return '<button class="quiz-opt" type="button" data-o="' + oi + '">' + o + '</button>'; }).join('') +
        '</div></div>';
    });
    html += '<div id="quiz-result"></div>';
    root.innerHTML = html;

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('.quiz-opt');
      if (!btn || btn.disabled) return;
      var qEl = btn.closest('.quiz-q');
      var qi = +qEl.getAttribute('data-q');
      var oi = +btn.getAttribute('data-o');
      var q = l.quiz[qi];
      answers[qi] = oi === q.answer;
      $$('.quiz-opt', qEl).forEach(function (b) {
        b.disabled = true;
        var bo = +b.getAttribute('data-o');
        if (bo === q.answer) b.classList.add('correct');
        else if (bo === oi) b.classList.add('wrong');
      });
      var ex = document.createElement('div');
      ex.className = 'quiz-explain';
      ex.innerHTML = (oi === q.answer ? '✅ <b>Верно.</b> ' : '❌ <b>Не совсем.</b> ') + (q.explain || '');
      qEl.appendChild(ex);

      if (Object.keys(answers).length === l.quiz.length) {
        var correct = Object.keys(answers).filter(function (k) { return answers[k]; }).length;
        state.quiz[l.id] = { correct: correct, total: l.quiz.length };
        persist();
        var msg = correct === l.quiz.length ? '🎉 Идеально!' : (correct >= l.quiz.length * 0.7 ? '👍 Хорошо, но перечитай разделы с ошибками.' : '📖 Стоит перечитать урок.');
        $('#quiz-result').innerHTML = '<div class="quiz-score">Результат: ' + correct + ' из ' + l.quiz.length + '. ' + msg +
          ' <button class="btn small" id="quiz-retry" type="button">Пройти заново</button></div>';
        $('#quiz-retry').addEventListener('click', function () { renderQuiz(l); });
      }
    });
  }

  function initChecks() {
    $$('input[data-check]').forEach(function (cb) {
      var k = cb.getAttribute('data-check');
      cb.checked = !!state.checks[k];
      cb.addEventListener('change', function () {
        if (cb.checked) state.checks[k] = true; else delete state.checks[k];
        persist();
      });
    });
  }

  // ---------- Справочник ----------
  function renderReference() {
    var p = COURSE.pages.reference;
    return '<article class="page"><div class="crumbs"><a href="#/">Курс</a> / Справочник</div><h1>' + p.title + '</h1>' + p.body + '</article>';
  }

  // ---------- Глобальные обработчики ----------
  document.addEventListener('click', function (e) {
    var copy = e.target.closest('.code-copy');
    if (copy) {
      var text = copy.closest('.code').querySelector('pre').innerText;
      var done = function () { copy.textContent = 'Скопировано ✓'; setTimeout(function () { copy.textContent = 'Копировать'; }, 1500); };
      var fallback = function () {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(ta); done();
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
      return;
    }
    if (e.target.id === 'reset-progress') {
      e.preventDefault();
      if (confirm('Сбросить весь прогресс, результаты тестов и чек-листы?')) {
        state = { done: {}, quiz: {}, checks: {}, collapsed: {} };
        persist(); route();
      }
    }
  });

  $('#burger').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
  $('#backdrop').addEventListener('click', function () { document.body.classList.remove('nav-open'); });

  $('#theme-toggle').addEventListener('click', function () {
    var root = document.documentElement;
    var cur = root.getAttribute('data-theme') ||
      (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var nt = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', nt);
    try { localStorage.setItem('jsc-theme', nt); } catch (err) {}
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input, textarea') || e.ctrlKey || e.metaKey || !e.altKey) return;
    var id = currentId();
    var l = id && byId[id];
    if (!l) return;
    if (e.key === 'ArrowRight' && lessons[l.index + 1]) location.hash = '#/lesson/' + lessons[l.index + 1].id;
    if (e.key === 'ArrowLeft' && lessons[l.index - 1]) location.hash = '#/lesson/' + lessons[l.index - 1].id;
  });

  window.addEventListener('hashchange', route);
  route();
})();
