/* =========================================================
   pycell.js — 페이지의 <div class="pycell"> 을 실행 가능한 셀로 바꾼다.

   사용법 (HTML):
     <div class="pycell" data-packages="pandas" data-data="cafe_sales.csv">
     import pandas as pd
     df = pd.read_csv("cafe_sales.csv")
     df.head()
     </div>

   속성
     data-packages  쉼표로 구분한 파이썬 패키지 (기본: 없음)
     data-data      쉼표로 구분한 data/ 하위 CSV 파일명
     data-font      "1" 이면 한글 폰트 등록 (그래프를 그리는 셀)
     data-title     셀 제목 (기본: "직접 해보기")
     data-autorun   "1" 이면 페이지 로드 후 자동 실행 (권장하지 않음)
   ========================================================= */
(function (global) {
  'use strict';

  var INDENT = '    ';
  var cells = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* 들여쓰기를 유지한 채 HTML 안의 코드를 꺼낸다. */
  function extractCode(node) {
    var raw = node.textContent.replace(/\t/g, INDENT);
    var lines = raw.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
    var indents = lines
      .filter(function (l) { return l.trim(); })
      .map(function (l) { return l.match(/^ */)[0].length; });
    var base = indents.length ? Math.min.apply(null, indents) : 0;
    return lines.map(function (l) { return l.slice(base); }).join('\n');
  }

  function build(node) {
    var original = extractCode(node);
    var packages = (node.dataset.packages || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var dataFiles = (node.dataset.data || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var needsFont = node.dataset.font === '1' || packages.indexOf('matplotlib') >= 0 || packages.indexOf('seaborn') >= 0;

    node.textContent = '';
    node.classList.add('pycell-ready');

    /* ---- 머리말 ---- */
    var head = el('div', 'pycell-head');
    head.appendChild(el('span', 'pycell-title', node.dataset.title || '직접 해보기'));

    var actions = el('div', 'pycell-actions');
    var runBtn = el('button', 'btn primary pycell-run', '▶ 실행');
    var resetBtn = el('button', 'btn pycell-reset', '처음으로');
    resetBtn.title = '코드를 원래대로 되돌립니다';
    actions.appendChild(runBtn);
    actions.appendChild(resetBtn);
    head.appendChild(actions);

    /* ---- 편집기 ---- */
    var editor = el('div', 'pycell-editor');
    var gutter = el('div', 'pycell-gutter');
    var ta = el('textarea', 'pycell-code');
    ta.value = original;
    ta.spellcheck = false;
    ta.setAttribute('aria-label', '파이썬 코드');
    editor.appendChild(gutter);
    editor.appendChild(ta);

    /* ---- 상태 · 출력 ---- */
    var status = el('div', 'pycell-status');
    var bar = el('div', 'pycell-bar');
    var barFill = el('div', 'pycell-bar-fill');
    bar.appendChild(barFill);
    status.appendChild(bar);
    status.appendChild(el('span', 'pycell-status-text', ''));

    var out = el('div', 'pycell-out');

    node.appendChild(head);
    node.appendChild(editor);
    node.appendChild(status);
    node.appendChild(out);

    /* ---- 줄 번호 ---- */
    function syncGutter() {
      var n = ta.value.split('\n').length;
      var html = '';
      for (var i = 1; i <= n; i++) html += i + '\n';
      gutter.textContent = html;
      autoGrow();
    }
    function autoGrow() {
      ta.style.height = 'auto';
      ta.style.height = Math.max(72, ta.scrollHeight) + 'px';
      gutter.style.height = ta.style.height;
    }
    ta.addEventListener('input', syncGutter);
    ta.addEventListener('scroll', function () { gutter.scrollTop = ta.scrollTop; });

    /* Tab 은 들여쓰기, Ctrl/Cmd+Enter 는 실행 */
    ta.addEventListener('keydown', function (ev) {
      if (ev.key === 'Tab') {
        ev.preventDefault();
        var s = ta.selectionStart, e = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + INDENT + ta.value.slice(e);
        ta.selectionStart = ta.selectionEnd = s + INDENT.length;
        syncGutter();
      } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        run();
      }
    });

    /* ---- 상태 표시 ---- */
    function setStatus(msg, pct, kind) {
      node.dataset.state = kind || '';
      status.querySelector('.pycell-status-text').textContent = msg || '';
      if (pct === null || pct === undefined) {
        bar.style.display = 'none';
      } else {
        bar.style.display = '';
        barFill.style.width = pct + '%';
      }
    }

    /* ---- 실행 ---- */
    var running = false;

    function run() {
      if (running) return;
      running = true;
      runBtn.disabled = true;
      out.textContent = '';
      out.classList.remove('has-content');

      var first = !global.PyLab.state.pyodide;
      setStatus(first ? '파이썬을 준비하는 중… 처음 한 번은 10~30초 걸립니다' : '실행 중…', first ? 5 : null, 'busy');

      var P = global.PyLab;
      P.boot()
        .then(function (py) { return P.ensureBootstrap(py).then(function () { return py; }); })
        .then(function (py) { return P.ensurePackages(py, packages).then(function () { return py; }); })
        .then(function (py) { return P.ensureData(py, dataFiles).then(function () { return py; }); })
        .then(function (py) {
          if (!needsFont) return py;
          return P.ensureFont(py).then(function () { return py; });
        })
        .then(function (py) {
          setStatus('실행 중…', null, 'busy');
          return P.runCode(py, ta.value);
        })
        .then(function (res) {
          render(res);
          setStatus('', null, res.error ? 'error' : 'done');
        })
        .catch(function (err) {
          renderFatal(err);
          setStatus('', null, 'error');
        })
        .then(function () {
          running = false;
          runBtn.disabled = false;
        });
    }

    /* ---- 출력 그리기 ---- */
    function render(res) {
      out.classList.add('has-content');

      if (res.stdout) {
        out.appendChild(el('pre', 'pycell-stdout', res.stdout.replace(/\n$/, '')));
      }

      if (res.result) {
        if (res.result.kind === 'html') {
          var wrap = el('div', 'pycell-table');
          wrap.innerHTML = res.result.data;   // pandas to_html — 우리가 만든 데이터만 들어온다
          out.appendChild(wrap);
        } else {
          out.appendChild(el('pre', 'pycell-value', res.result.data));
        }
      }

      (res.figures || []).forEach(function (b64) {
        var img = el('img', 'pycell-fig');
        img.src = 'data:image/png;base64,' + b64;
        img.alt = '그래프 결과';
        img.loading = 'lazy';
        out.appendChild(img);
      });

      if (res.error) {
        var box = el('div', 'pycell-error');
        var hint = global.PyLab.hintFor(res.error);
        if (hint) {
          box.appendChild(el('p', 'pycell-hint', '💡 ' + hint));
        }
        var det = el('details');
        det.appendChild(el('summary', null, '자세한 오류 내용'));
        det.appendChild(el('pre', null, global.PyLab.trimTrace(res.error)));
        box.appendChild(det);
        out.appendChild(box);
      }

      if (!out.children.length) {
        out.appendChild(el('p', 'pycell-empty', '실행됐습니다. (출력할 값이 없는 코드입니다 — print() 를 써보세요)'));
      }
    }

    function renderFatal(err) {
      out.classList.add('has-content');
      var box = el('div', 'pycell-error');
      box.appendChild(el('p', 'pycell-hint',
        '⚠️ 파이썬 실행기를 불러오지 못했습니다. 네트워크가 막혀 있거나 CDN 접속이 차단된 환경일 수 있습니다.'));
      box.appendChild(el('p', null, '아래 “Colab에서 열기” 버튼으로 같은 실습을 진행할 수 있습니다.'));
      var det = el('details');
      det.appendChild(el('summary', null, '자세한 내용'));
      det.appendChild(el('pre', null, String(err && err.message || err)));
      box.appendChild(det);
      out.appendChild(box);
    }

    runBtn.addEventListener('click', run);
    resetBtn.addEventListener('click', function () {
      ta.value = original;
      syncGutter();
      out.textContent = '';
      out.classList.remove('has-content');
      setStatus('', null, '');
    });

    global.PyLab.onProgress(function (msg, pct) {
      if (running) setStatus(msg, pct, 'busy');
    });

    syncGutter();
    setStatus('', null, '');

    if (node.dataset.autorun === '1') run();

    cells.push({ node: node, run: run });
  }

  function init() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.pycell:not(.pycell-ready)'));
    nodes.forEach(build);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.PyCell = { init: init, cells: cells };
})(window);
