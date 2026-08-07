/* =========================================================
   pylab.js — 블로그 안에서 돌아가는 파이썬 실습 셀
   Pyodide(CPython → WebAssembly) 위에서 pandas / matplotlib 를 실행한다.

   설계 원칙
     · 게으른 로딩 — 사용자가 [실행]을 누르기 전까지 아무것도 받지 않는다.
       Pyodide + pandas 는 수십 MB라, 글만 읽고 가는 독자에게 이걸 미리
       내려받게 하면 안 된다.
     · 런타임 하나를 페이지 전체가 공유한다. 앞 셀에서 만든 변수가
       뒤 셀에서 그대로 살아 있어야 학습 흐름이 끊기지 않는다.
     · 실패해도 글은 읽을 수 있어야 한다. 로딩이 막히면 Colab 링크를 안내한다.
   ========================================================= */
(function (global) {
  'use strict';

  var PYODIDE_VERSION = '0.28.3';
  var PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v' + PYODIDE_VERSION + '/full/';

  /* 저장소 루트. modules/ 나 python/ 하위에서 열려도 자원 경로를 맞춘다. */
  var ROOT = (function () {
    var s = document.currentScript;
    if (s && s.src) return s.src.replace(/assets\/pylab\.js.*$/, '');
    return location.href.replace(/[^/]*$/, '').replace(/(python|modules)\/$/, '');
  })();

  var state = {
    pyodide: null,
    booting: null,          // 부팅 중이면 Promise
    loadedPackages: {},     // 이미 로드한 파이썬 패키지
    loadedData: {},         // 이미 가상 파일시스템에 올린 CSV
    fontReady: false
  };

  var listeners = [];
  function onProgress(fn) { listeners.push(fn); }
  function emit(msg, pct) { listeners.forEach(function (f) { f(msg, pct); }); }

  /* ---------------------------------------------------------
     1. Pyodide 부팅
     --------------------------------------------------------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('스크립트를 불러오지 못했습니다: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function boot() {
    if (state.pyodide) return Promise.resolve(state.pyodide);
    if (state.booting) return state.booting;

    state.booting = (function () {
      var p = Promise.resolve();
      if (!global.loadPyodide) {
        emit('파이썬 실행기를 내려받는 중…', 5);
        p = p.then(function () { return loadScript(PYODIDE_CDN + 'pyodide.js'); });
      }
      return p
        .then(function () {
          emit('파이썬을 시작하는 중… (처음 한 번만 걸립니다)', 20);
          return global.loadPyodide({ indexURL: PYODIDE_CDN });
        })
        .then(function (py) {
          state.pyodide = py;
          emit('준비 완료', 100);
          return py;
        })
        .catch(function (err) {
          state.booting = null;   // 다음 클릭에서 다시 시도할 수 있게
          throw err;
        });
    })();

    return state.booting;
  }

  /* ---------------------------------------------------------
     2. 패키지 / 데이터 / 폰트 준비
     --------------------------------------------------------- */
  function ensurePackages(py, names) {
    var need = names.filter(function (n) { return !state.loadedPackages[n]; });
    if (!need.length) return Promise.resolve();

    // 배포판에 없는 것은 micropip 으로 PyPI 에서 받는다 (순수 파이썬 패키지)
    var MICROPIP_ONLY = { seaborn: 1, plotly: 1, openpyxl: 1 };
    var builtin = need.filter(function (n) { return !MICROPIP_ONLY[n]; });
    var viaPip = need.filter(function (n) { return MICROPIP_ONLY[n]; });

    emit('라이브러리를 준비하는 중… (' + need.join(', ') + ')', 45);

    var chain = builtin.length ? py.loadPackage(builtin) : Promise.resolve();

    if (viaPip.length) {
      chain = chain
        .then(function () { return py.loadPackage('micropip'); })
        .then(function () {
          var mp = py.pyimport('micropip');
          return mp.install(viaPip);
        });
    }

    return chain.then(function () {
      need.forEach(function (n) { state.loadedPackages[n] = true; });
    });
  }

  /** CSV 를 Pyodide 가상 파일시스템에 올려 pd.read_csv('파일명') 이 그냥 되게 한다. */
  function ensureData(py, files) {
    var need = files.filter(function (f) { return !state.loadedData[f]; });
    if (!need.length) return Promise.resolve();

    emit('예시 데이터를 불러오는 중…', 70);

    return Promise.all(need.map(function (name) {
      return fetch(ROOT + 'data/' + name)
        .then(function (r) {
          if (!r.ok) throw new Error('데이터 파일을 찾을 수 없습니다: ' + name);
          return r.arrayBuffer();
        })
        .then(function (buf) {
          py.FS.writeFile(name, new Uint8Array(buf));
          state.loadedData[name] = true;
        });
    }));
  }

  /** matplotlib 한글 폰트 등록. 안 하면 라벨이 전부 □□□ 로 나온다. */
  function ensureFont(py) {
    if (state.fontReady) return Promise.resolve();

    return fetch(ROOT + 'assets/fonts/NanumGothic-subset.ttf')
      .then(function (r) {
        if (!r.ok) throw new Error('font missing');
        return r.arrayBuffer();
      })
      .then(function (buf) {
        py.FS.writeFile('/NanumGothic.ttf', new Uint8Array(buf));
        return py.runPythonAsync([
          'import matplotlib',
          'from matplotlib import font_manager',
          'font_manager.fontManager.addfont("/NanumGothic.ttf")',
          '_n = font_manager.FontProperties(fname="/NanumGothic.ttf").get_name()',
          'matplotlib.rcParams["font.family"] = _n',
          'matplotlib.rcParams["axes.unicode_minus"] = False',   // 음수 부호 깨짐 방지
        ].join('\n'));
      })
      .then(function () { state.fontReady = true; })
      .catch(function () {
        // 폰트가 없어도 실습 자체는 되어야 한다. 한글만 깨진 채로 진행.
        state.fontReady = true;
      });
  }

  /* ---------------------------------------------------------
     3. 실행 환경 초기화 (한 번만)
     --------------------------------------------------------- */
  var BOOTSTRAP = [
    'import sys, io, base64, builtins',
    'import matplotlib',
    'matplotlib.use("AGG")',                     // 화면이 없으므로 이미지로만 그린다
    'import matplotlib.pyplot as plt',
    'matplotlib.rcParams["figure.figsize"] = (7.2, 4.0)',
    'matplotlib.rcParams["figure.dpi"] = 110',
    'matplotlib.rcParams["axes.grid"] = True',
    'matplotlib.rcParams["grid.alpha"] = 0.3',
    'matplotlib.rcParams["axes.spines.top"] = False',
    'matplotlib.rcParams["axes.spines.right"] = False',
    '',
    'def _pylab_figures():',
    '    out = []',
    '    for num in plt.get_fignums():',
    '        fig = plt.figure(num)',
    '        buf = io.BytesIO()',
    '        fig.savefig(buf, format="png", bbox_inches="tight")',
    '        out.append(base64.b64encode(buf.getvalue()).decode())',
    '    plt.close("all")',
    '    return out',
    '',
    'def _pylab_render(value):',
    '    """마지막 줄의 값을 주피터처럼 보기 좋게 만든다."""',
    '    if value is None:',
    '        return None',
    '    try:',
    '        import pandas as pd',
    '        if isinstance(value, pd.DataFrame):',
    '            return {"kind": "html", "data": value.to_html(max_rows=20, border=0)}',
    '        if isinstance(value, pd.Series):',
    '            return {"kind": "html", "data": value.to_frame().to_html(max_rows=20, border=0)}',
    '    except ImportError:',
    '        pass',
    '    return {"kind": "text", "data": repr(value)}',
  ].join('\n');

  var bootstrapped = false;

  function ensureBootstrap(py) {
    if (bootstrapped) return Promise.resolve();
    return py.runPythonAsync(BOOTSTRAP).then(function () { bootstrapped = true; });
  }

  /* ---------------------------------------------------------
     4. 코드 실행
        마지막 줄이 표현식이면 주피터처럼 그 값을 출력한다.
     --------------------------------------------------------- */
  function runCode(py, code) {
    var stdout = [];
    py.setStdout({ batched: function (s) { stdout.push(s); } });
    py.setStderr({ batched: function (s) { stdout.push(s); } });

    // 사용자 코드를 문자열로 파이썬에 넘겨 ast 로 처리한다.
    py.globals.set('_pylab_src', code);

    var driver = [
      'import ast',
      '_pylab_result = None',
      '_pylab_error = None',
      'try:',
      '    _tree = ast.parse(_pylab_src)',
      '    _body, _last = _tree.body[:-1], (_tree.body[-1] if _tree.body else None)',
      '    if _body:',
      '        exec(compile(ast.Module(body=_body, type_ignores=[]), "<셀>", "exec"), globals())',
      '    if isinstance(_last, ast.Expr):',
      '        _pylab_result = eval(',
      '            compile(ast.Expression(body=_last.value), "<셀>", "eval"), globals())',
      '    elif _last is not None:',
      '        exec(compile(ast.Module(body=[_last], type_ignores=[]), "<셀>", "exec"), globals())',
      'except Exception:',
      '    import traceback',
      '    _pylab_error = traceback.format_exc()',
    ].join('\n');

    return py.runPythonAsync(driver).then(function () {
      var err = py.globals.get('_pylab_error');
      var rendered = null;

      if (!err) {
        var res = py.runPython('_pylab_render(_pylab_result)');
        if (res) {
          rendered = { kind: res.get('kind'), data: res.get('data') };
          res.destroy();
        }
      }

      var figs = py.runPython('_pylab_figures()').toJs();

      return {
        stdout: stdout.join(''),
        result: rendered,
        figures: figs,
        error: err || null
      };
    });
  }

  /* ---------------------------------------------------------
     5. 파이썬 예외를 초보자가 읽을 수 있게 다듬기
     --------------------------------------------------------- */
  var ERROR_HINTS = [
    [/NameError: name '(\w+)'/, '$1 이라는 이름을 아직 만들지 않았습니다. 철자를 확인하거나, 위 셀을 먼저 실행했는지 보세요.'],
    [/ModuleNotFoundError: No module named '(\w+)'/, '$1 라이브러리가 이 셀에 준비돼 있지 않습니다.'],
    [/FileNotFoundError.*'([^']+)'/, '$1 파일을 찾을 수 없습니다. 파일명을 확인하세요.'],
    [/KeyError: '([^']+)'/, "'$1' 이라는 열(column)이 없습니다. df.columns 로 실제 열 이름을 확인해보세요."],
    [/IndentationError/, '들여쓰기가 맞지 않습니다. 같은 블록은 칸 수를 똑같이 맞춰야 합니다.'],
    [/SyntaxError/, '문법 오류입니다. 괄호나 따옴표가 짝이 맞는지 확인해보세요.'],
    [/AttributeError: .*has no attribute '(\w+)'/, "'$1' 이라는 기능이 없습니다. 오타이거나 다른 자료형일 수 있습니다."],
    [/TypeError/, '자료형이 맞지 않습니다. 숫자에 문자를 더하려 하지 않았는지 보세요.'],
    [/ZeroDivisionError/, '0으로 나눌 수 없습니다.'],
  ];

  function hintFor(trace) {
    for (var i = 0; i < ERROR_HINTS.length; i++) {
      var m = trace.match(ERROR_HINTS[i][0]);
      if (m) {
        return ERROR_HINTS[i][1].replace(/\$(\d)/g, function (_, n) { return m[n]; });
      }
    }
    return null;
  }

  /** 트레이스백에서 사용자에게 의미 있는 줄만 남긴다. */
  function trimTrace(trace) {
    var lines = trace.split('\n');
    var keep = lines.filter(function (l) {
      return !/File "<(exec|string)>"/.test(l) && !/in _pylab_/.test(l);
    });
    return keep.join('\n').trim();
  }

  global.PyLab = {
    boot: boot,
    ensurePackages: ensurePackages,
    ensureData: ensureData,
    ensureFont: ensureFont,
    ensureBootstrap: ensureBootstrap,
    runCode: runCode,
    onProgress: onProgress,
    hintFor: hintFor,
    trimTrace: trimTrace,
    state: state,
    ROOT: ROOT,
    CDN: PYODIDE_CDN
  };
})(window);
