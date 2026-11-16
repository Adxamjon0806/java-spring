/*
 * Хелперы для написания уроков + подсветка синтаксиса.
 *
 * Блоки кода пишутся теговыми шаблонами: java`...`, js`...`, xml`...` и т.д.
 * Внутри них обратные слэши сохраняются как есть (String.raw).
 * Если нужен символ ` или ${ внутри кода — экранируй: \` и \${
 * Первая строка вида "@@ Имя.java" становится заголовком блока.
 */
(function (global) {
  'use strict';

  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // ---------- Подсветка ----------
  var P = {
    cline: /\/\/[^\n]*|\/\*[\s\S]*?\*\//.source,
    hash: /#[^\n]*/.source,
    dash: /--[^\n]*/.source,
    xmlc: /<!--[\s\S]*?-->/.source,
    str: /"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/.source,
    dstr: /"(?:\\.|[^"\\\n])*"/.source,
    tstr: /`(?:\\.|[^`\\])*`/.source,
    num: /\b\d[\d_]*(?:\.\d+)?[LlFfDd]?\b/.source,
    word: /[A-Za-z_$][\w$]*/.source,
    ann: /@[A-Za-z_]\w*/.source,
    yamlKey: /(?<=^[ \t]*(?:- )?)[\w.\-\/]+(?=:)/.source,
    propKey: /^[\w.\-\[\]]+(?=\s*[=:])/.source,
    jsonKey: /"(?:\\.|[^"\\])*"(?=\s*:)/.source,
    xmlTag: /<\/?[\w:.\-]+|\/?>/.source,
    xmlAttr: /\b[\w:\-]+(?==)/.source,
    header: /^[\w\-]+(?=:)/.source
  };

  function rx(parts) {
    return new RegExp(parts.map(function (p) { return '(?<' + p[0] + '>' + p[1] + ')'; }).join('|'), 'gm');
  }
  function set(s) { var o = Object.create(null); s.split(/\s+/).forEach(function (w) { if (w) o[w] = true; }); return o; }

  var LIT = set('true false null undefined');
  var LANGS = {
    java: {
      label: 'Java', re: rx([['c', P.cline], ['s', P.str], ['a', P.ann], ['n', P.num], ['w', P.word]]),
      kw: set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record sealed permits non-sealed yield when'),
      types: true
    },
    js: {
      label: 'JavaScript', re: rx([['c', P.cline], ['s', P.tstr + '|' + P.str], ['n', P.num], ['w', P.word]]),
      kw: set('async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while yield require module'),
      types: true
    },
    ts: {
      label: 'TypeScript', re: rx([['c', P.cline], ['s', P.tstr + '|' + P.str], ['a', P.ann], ['n', P.num], ['w', P.word]]),
      kw: set('async await break case catch class const continue default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while yield interface type implements private public readonly enum as constructor'),
      types: true
    },
    sql: {
      label: 'SQL', re: rx([['c', P.dash], ['s', P.str], ['n', P.num], ['w', P.word]]),
      kw: set('select from where insert into values update set delete create table primary key references foreign not null unique index alter add drop join left right inner outer on and or order by group having limit offset as default serial bigserial bigint varchar text boolean timestamp integer int constraint cascade distinct count returning if exists in is like with timestamptz numeric generated always identity'),
      ci: true
    },
    xml: { label: 'XML', re: rx([['c', P.xmlc], ['s', P.dstr], ['t', P.xmlTag], ['r', P.xmlAttr]]) },
    yaml: { label: 'YAML', re: rx([['c', P.hash], ['k', P.yamlKey], ['s', P.str], ['n', P.num], ['w', P.word]]), kw: set('') },
    props: { label: 'properties', re: rx([['c', P.hash], ['k', P.propKey]]) },
    json: { label: 'JSON', re: rx([['k', P.jsonKey], ['s', P.dstr], ['n', P.num], ['w', P.word]]), kw: set('') },
    bash: {
      label: 'Терминал', re: rx([['c', P.hash], ['s', P.str], ['w', P.word]]),
      kw: set('cd ls echo export docker curl mvn mvnw gradle gradlew git java javac sudo brew apt winget npm npx node set cat mkdir')
    },
    docker: {
      label: 'Dockerfile', re: rx([['c', P.hash], ['s', P.str], ['w', P.word]]),
      kw: set('FROM WORKDIR COPY RUN EXPOSE ENTRYPOINT CMD ENV ARG AS USER')
    },
    http: {
      label: 'HTTP', re: rx([['c', P.hash], ['k', P.header], ['s', P.dstr], ['n', P.num], ['w', P.word]]),
      kw: set('GET POST PUT PATCH DELETE HTTP Authorization')
    },
    text: { label: 'Текст' }
  };

  function highlight(src, lang) {
    var L = LANGS[lang] || LANGS.text;
    if (!L.re) return esc(src);
    var re = new RegExp(L.re.source, 'gm');
    var out = '', last = 0, m;
    while ((m = re.exec(src))) {
      var tok = m[0];
      if (!tok) { re.lastIndex++; continue; }
      if (m.index > last) out += esc(src.slice(last, m.index));
      var g = m.groups, cls = null;
      if (g.c) cls = 'c';
      else if (g.s) cls = 's';
      else if (g.a) cls = 'a';
      else if (g.n) cls = 'n';
      else if (g.k) cls = 'k';
      else if (g.t) cls = 'tag';
      else if (g.r) cls = 'attr';
      else if (g.w) {
        var key = L.ci ? tok.toLowerCase() : tok;
        if (L.kw && L.kw[key]) cls = 'kw';
        else if (LIT[tok]) cls = 'lit';
        else if (L.types && src.charAt(m.index + tok.length) === '(') cls = 'fn';
        else if (L.types && /^[A-Z]/.test(tok)) cls = 'type';
      }
      out += cls ? '<span class="tok-' + cls + '">' + esc(tok) + '</span>' : esc(tok);
      last = m.index + tok.length;
    }
    return out + esc(src.slice(last));
  }

  function dedent(s) {
    s = s.replace(/^[ \t]*\n/, '').replace(/\n[ \t]*$/, '');
    var lines = s.split('\n');
    var min = Infinity;
    lines.forEach(function (l) {
      if (l.trim()) min = Math.min(min, l.match(/^[ \t]*/)[0].length);
    });
    if (min === Infinity) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join('\n');
  }

  function codeBlock(lang, src) {
    var code = dedent(src);
    var title = '';
    var m = code.match(/^@@ ([^\n]+)\n/);
    if (m) { title = m[1]; code = code.slice(m[0].length); }
    var L = LANGS[lang] || LANGS.text;
    return '<div class="code"><div class="code-head"><span class="code-lang ' + lang + '">' + L.label + '</span>' +
      (title ? '<span class="code-title">' + esc(title) + '</span>' : '') +
      '<button class="code-copy" type="button">Копировать</button></div>' +
      '<pre><code class="lang-' + lang + '">' + highlight(code, lang) + '</code></pre></div>';
  }

  function tag(lang) {
    return function (strings) {
      var vals = Array.prototype.slice.call(arguments, 1);
      var raw = String.raw.apply(null, [strings].concat(vals));
      raw = raw.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
      return codeBlock(lang, raw);
    };
  }

  ['java', 'js', 'ts', 'sql', 'xml', 'yaml', 'props', 'json', 'bash', 'docker', 'http', 'text'].forEach(function (l) {
    global[l] = tag(l);
  });

  // ---------- Блоки разметки ----------
  function box(cls, title) {
    return function (html, customTitle) {
      return '<div class="callout ' + cls + '"><div class="callout-title">' + (customTitle || title) + '</div><div>' + html + '</div></div>';
    };
  }
  global.tip = box('tip', '💡 Совет');
  global.node = box('node', '🟨 Аналогия с Node.js');
  global.warn = box('warn', '⚠️ Подводный камень');
  global.info = box('info', 'ℹ️ Важно знать');

  // Сравнение «слева Node — справа Java»
  global.cmp = function (left, right, lLabel, rLabel) {
    return '<div class="cmp"><div><span class="cmp-label l">' + (lLabel || 'Node.js') + '</span>' + left +
      '</div><div><span class="cmp-label r">' + (rLabel || 'Java') + '</span>' + right + '</div></div>';
  };

  // Таблица: table(['A','B'], [['a1','b1'], ...]) — ячейки как HTML
  global.table = function (head, rows) {
    return '<div class="table-wrap"><table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  };

  global.flow = function () {
    return '<div class="flow">' + Array.prototype.map.call(arguments, function (x) { return '<span>' + esc(x) + '</span>'; }).join('<b>→</b>') + '</div>';
  };

  global.tree = function (strings) {
    var vals = Array.prototype.slice.call(arguments, 1);
    return '<div class="tree">' + esc(dedent(String.raw.apply(null, [strings].concat(vals)))) + '</div>';
  };

  // Чек-лист с сохранением состояния: checklist('id', ['пункт', ...])
  global.checklist = function (id, items) {
    return '<div class="checklist">' + items.map(function (t, i) {
      return '<label class="check"><input type="checkbox" data-check="' + id + '-' + i + '"><span>' + t + '</span></label>';
    }).join('') + '</div>';
  };

  global.escapeHtml = esc;

  global.COURSE = {
    modules: [],
    pages: {},
    addModule: function (m) { this.modules.push(m); },
    addPage: function (id, p) { this.pages[id] = p; }
  };
})(window);
