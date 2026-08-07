/* =========================================================
   viz.js — 통계 시각화 모듈 공통 라이브러리
   외부 의존성 없음. window.V 로 노출된다.
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------
     0. URL 옵션  (?theme=dark|light, ?embed=1)
     --------------------------------------------------------- */
  var PARAMS = new URLSearchParams(global.location.search);
  var THEME = PARAMS.get('theme');
  var EMBED = PARAMS.get('embed') === '1' || PARAMS.get('embed') === 'true';
  var VIEW = PARAMS.get('view');   // 'viz' = 인터랙션 패널만, 그 외 = 전체

  if (THEME === 'dark' || THEME === 'light') {
    document.documentElement.setAttribute('data-theme', THEME);
  }
  if (EMBED) {
    document.documentElement.setAttribute('data-embed', '1');
  }
  if (VIEW === 'viz') {
    document.documentElement.setAttribute('data-view', 'viz');
  }

  /* ---------------------------------------------------------
     1. 테마 색 읽기 (CSS 변수 → 캔버스)
     --------------------------------------------------------- */
  var colorCache = {};

  function css(name) {
    if (colorCache[name] === undefined) {
      colorCache[name] = getComputedStyle(document.documentElement)
        .getPropertyValue(name).trim() || '#888';
    }
    return colorCache[name];
  }

  function clearColorCache() { colorCache = {}; }

  /* ---------------------------------------------------------
     2. 다시 그리기 레지스트리
        모듈은 V.onRedraw(draw) 로 등록만 하면
        리사이즈 / 테마 변경 시 자동으로 다시 그려진다.
     --------------------------------------------------------- */
  var redrawFns = [];

  function onRedraw(fn) {
    redrawFns.push(fn);
    return fn;
  }

  function redrawAll() {
    for (var i = 0; i < redrawFns.length; i++) {
      try { redrawFns[i](); } catch (e) { /* 한 모듈의 오류가 전체를 막지 않게 */ }
    }
  }

  var resizeTimer = null;
  global.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { redrawAll(); reportHeight(); }, 80);
  });

  if (global.matchMedia) {
    try {
      global.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', function () { clearColorCache(); redrawAll(); });
    } catch (e) { /* 구형 브라우저 무시 */ }
  }

  /* ---------------------------------------------------------
     3. iframe 높이 보고 (티스토리 등에 임베드했을 때 사용)
        부모 페이지가 원하면 statviz-height 메시지를 받아
        iframe 높이를 맞출 수 있다.
     --------------------------------------------------------- */
  function reportHeight() {
    if (global.parent === global) return;
    var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    try {
      global.parent.postMessage({
        type: 'statviz-height',
        src: global.location.pathname.split('/').pop(),
        height: h
      }, '*');
    } catch (e) { /* 크로스 오리진 실패는 무시 */ }
  }

  global.addEventListener('load', function () {
    reportHeight();
    if (global.ResizeObserver) {
      var ro = new ResizeObserver(function () { reportHeight(); });
      ro.observe(document.body);
    }
  });

  /* ---------------------------------------------------------
     4. 난수 발생기 (재현 가능한 시드)
     --------------------------------------------------------- */
  function Rng(seed) {
    this._s = (seed === undefined ? (Date.now() & 0x7fffffff) : seed) >>> 0;
    this._spare = null;
  }

  Rng.prototype.reseed = function (s) {
    this._s = s >>> 0;
    this._spare = null;
    return this;
  };

  /** [0,1) 균등난수 — mulberry32 */
  Rng.prototype.u = function () {
    this._s = (this._s + 0x6D2B79F5) >>> 0;
    var t = this._s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  Rng.prototype.uniform = function (a, b) { return a + (b - a) * this.u(); };

  /** 정규난수 — Marsaglia polar (여분값 캐시) */
  Rng.prototype.normal = function (mu, sd) {
    mu = mu || 0;
    sd = (sd === undefined) ? 1 : sd;
    if (this._spare !== null) {
      var s = this._spare;
      this._spare = null;
      return mu + sd * s;
    }
    var u, v, q;
    do {
      u = this.u() * 2 - 1;
      v = this.u() * 2 - 1;
      q = u * u + v * v;
    } while (q >= 1 || q === 0);
    var m = Math.sqrt(-2 * Math.log(q) / q);
    this._spare = v * m;
    return mu + sd * u * m;
  };

  /** 지수난수 (평균 = 1/rate) */
  Rng.prototype.exp = function (rate) {
    return -Math.log(1 - this.u()) / (rate || 1);
  };

  Rng.prototype.int = function (nExclusive) { return Math.floor(this.u() * nExclusive); };
  Rng.prototype.pick = function (arr) { return arr[this.int(arr.length)]; };

  Rng.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = this.int(i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  /* ---------------------------------------------------------
     5. 수학 함수
     --------------------------------------------------------- */
  function erf(x) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1 / (1 + p * x);
    var y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function normalPdf(x, mu, sd) {
    mu = mu || 0; sd = (sd === undefined) ? 1 : sd;
    var z = (x - mu) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  }

  function normalCdf(x, mu, sd) {
    mu = mu || 0; sd = (sd === undefined) ? 1 : sd;
    return 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));
  }

  /** 표준정규 분위수 (Acklam 근사) — 신뢰구간 임계값 계산용 */
  function normalQuantile(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
    var pLow = 0.02425, q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p <= 1 - pLow) {
      q = p - 0.5; r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
             (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function fmt(v, digits) {
    if (!isFinite(v)) return '–';
    digits = (digits === undefined) ? 2 : digits;
    return v.toFixed(digits);
  }

  /** 보기 좋은 눈금값 생성 */
  function ticks(lo, hi, count) {
    count = count || 6;
    var span = hi - lo;
    if (!(span > 0)) return [lo];
    var step = Math.pow(10, Math.floor(Math.log(span / count) / Math.LN10));
    var err = (span / count) / step;
    if (err >= 7.5) step *= 10;
    else if (err >= 3.5) step *= 5;
    else if (err >= 1.5) step *= 2;
    var out = [];
    var start = Math.ceil(lo / step - 1e-9) * step;
    for (var v = start; v <= hi + step * 1e-9; v += step) {
      out.push(Math.abs(v) < step * 1e-9 ? 0 : Math.round(v / step) * step);
    }
    return out;
  }

  /* ---------------------------------------------------------
     6. 기술통계
     --------------------------------------------------------- */
  var S = {
    sum: function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; },

    mean: function (a) { return a.length ? S.sum(a) / a.length : NaN; },

    /** 모분산 (n으로 나눔) */
    varP: function (a, m) {
      if (!a.length) return NaN;
      m = (m === undefined) ? S.mean(a) : m;
      var s = 0;
      for (var i = 0; i < a.length; i++) { var d = a[i] - m; s += d * d; }
      return s / a.length;
    },

    /** 표본분산 (n-1로 나눔) */
    varS: function (a, m) {
      if (a.length < 2) return NaN;
      m = (m === undefined) ? S.mean(a) : m;
      var s = 0;
      for (var i = 0; i < a.length; i++) { var d = a[i] - m; s += d * d; }
      return s / (a.length - 1);
    },

    sdP: function (a, m) { return Math.sqrt(S.varP(a, m)); },
    sdS: function (a, m) { return Math.sqrt(S.varS(a, m)); },

    /** 분위수 (선형보간, R의 type-7) */
    quantile: function (sorted, p) {
      var n = sorted.length;
      if (!n) return NaN;
      if (n === 1) return sorted[0];
      var h = (n - 1) * p;
      var lo = Math.floor(h), hi = Math.ceil(h);
      return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
    },

    median: function (a) {
      var s = a.slice().sort(function (x, y) { return x - y; });
      return S.quantile(s, 0.5);
    },

    min: function (a) { return Math.min.apply(null, a); },
    max: function (a) { return Math.max.apply(null, a); },

    /** 피어슨 상관계수 */
    corr: function (xs, ys) {
      var n = xs.length;
      if (n < 2) return NaN;
      var mx = S.mean(xs), my = S.mean(ys);
      var sxy = 0, sxx = 0, syy = 0;
      for (var i = 0; i < n; i++) {
        var dx = xs[i] - mx, dy = ys[i] - my;
        sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
      }
      if (sxx === 0 || syy === 0) return NaN;
      return sxy / Math.sqrt(sxx * syy);
    },

    /** 최소제곱 단순회귀 */
    linreg: function (xs, ys) {
      var n = xs.length;
      if (n < 2) return { slope: NaN, intercept: NaN, r: NaN, r2: NaN };
      var mx = S.mean(xs), my = S.mean(ys);
      var sxy = 0, sxx = 0, syy = 0;
      for (var i = 0; i < n; i++) {
        var dx = xs[i] - mx, dy = ys[i] - my;
        sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
      }
      var slope = sxx === 0 ? 0 : sxy / sxx;
      var r = (sxx === 0 || syy === 0) ? 0 : sxy / Math.sqrt(sxx * syy);
      return { slope: slope, intercept: my - slope * mx, r: r, r2: r * r };
    },

    /** 잔차제곱합 */
    sse: function (xs, ys, slope, intercept) {
      var s = 0;
      for (var i = 0; i < xs.length; i++) {
        var e = ys[i] - (slope * xs[i] + intercept);
        s += e * e;
      }
      return s;
    },

    /**
     * 히스토그램
     * @returns {{bins:Array<{x0,x1,count,density}>, width:number, maxCount:number}}
     */
    histogram: function (data, lo, hi, nBins) {
      nBins = Math.max(1, Math.round(nBins));
      var w = (hi - lo) / nBins;
      var bins = new Array(nBins);
      for (var i = 0; i < nBins; i++) {
        bins[i] = { x0: lo + i * w, x1: lo + (i + 1) * w, count: 0, density: 0 };
      }
      for (var j = 0; j < data.length; j++) {
        var k = Math.floor((data[j] - lo) / w);
        if (k === nBins) k = nBins - 1;        // 오른쪽 경계값 포함
        if (k >= 0 && k < nBins) bins[k].count++;
      }
      var maxCount = 0;
      for (var q = 0; q < nBins; q++) {
        if (bins[q].count > maxCount) maxCount = bins[q].count;
        bins[q].density = data.length ? bins[q].count / (data.length * w) : 0;
      }
      return { bins: bins, width: w, maxCount: maxCount };
    }
  };

  /* ---------------------------------------------------------
     7. 모집단 카탈로그 (중심극한정리 등에서 공용)
     --------------------------------------------------------- */
  var POPS = {
    normal: {
      label: '정규 (종 모양)',
      mean: 50, sd: 12, domain: [8, 92], kind: 'cont',
      sample: function (r) { return r.normal(50, 12); },
      density: function (x) { return normalPdf(x, 50, 12); }
    },
    uniform: {
      label: '균등 (납작)',
      mean: 50, sd: 100 / Math.sqrt(12), domain: [-4, 104], kind: 'cont',
      sample: function (r) { return r.uniform(0, 100); },
      density: function (x) { return (x >= 0 && x <= 100) ? 0.01 : 0; }
    },
    skew: {
      label: '치우침 (긴 꼬리)',
      mean: 50, sd: 50, domain: [0, 210], kind: 'cont',
      sample: function (r) { return r.exp(1 / 50); },
      density: function (x) { return x < 0 ? 0 : 0.02 * Math.exp(-0.02 * x); }
    },
    bimodal: {
      label: '이봉 (봉우리 둘)',
      mean: 50, sd: Math.sqrt(674), domain: [0, 100], kind: 'cont',
      sample: function (r) { return r.u() < 0.5 ? r.normal(25, 7) : r.normal(75, 7); },
      density: function (x) { return 0.5 * normalPdf(x, 25, 7) + 0.5 * normalPdf(x, 75, 7); }
    },
    dice: {
      label: '주사위 (1~6)',
      mean: 3.5, sd: Math.sqrt(35 / 12), domain: [0.4, 6.6], kind: 'disc',
      values: [1, 2, 3, 4, 5, 6],
      sample: function (r) { return 1 + r.int(6); },
      pmf: function () { return 1 / 6; }
    }
  };

  /* ---------------------------------------------------------
     8. 캔버스 헬퍼
     --------------------------------------------------------- */
  var MAX_DPR = 2;

  /** 캔버스를 부모 폭에 맞추고 고해상도 대응 후 지운다. */
  function fitCanvas(canvas, cssHeight) {
    var parent = canvas.parentNode;
    var cssW = Math.max(200, Math.round(parent.getBoundingClientRect().width));
    var cssH = Math.round(typeof cssHeight === 'function' ? cssHeight(cssW) : cssHeight);
    var dpr = Math.min(global.devicePixelRatio || 1, MAX_DPR);
    var pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    return { ctx: ctx, w: cssW, h: cssH, dpr: dpr };
  }

  /** 캔버스 좌표 얻기 (마우스/터치 공용) */
  function pointerPos(canvas, ev) {
    var rect = canvas.getBoundingClientRect();
    var src = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  var FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

  /* ---------------------------------------------------------
     9. Plot — 축이 있는 2D 좌표 플롯
     --------------------------------------------------------- */
  function Plot(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.margin = Object.assign({ top: 16, right: 16, bottom: 32, left: 46 }, opts.margin || {});
    this.xDomain = opts.xDomain || [0, 1];
    this.yDomain = opts.yDomain || [0, 1];
    this.height = opts.height || 300;   // 숫자 또는 (cssWidth)=>숫자
    this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0; this.pw = 0; this.ph = 0;
  }

  /** 크기 재조정 + 지우기. 그릴 때마다 맨 처음 호출한다. */
  Plot.prototype.begin = function () {
    var f = fitCanvas(this.canvas, this.height);
    this.ctx = f.ctx;
    this.w = f.w; this.h = f.h;
    this.pw = this.w - this.margin.left - this.margin.right;
    this.ph = this.h - this.margin.top - this.margin.bottom;
    return this;
  };

  Plot.prototype.x = function (v) {
    var d = this.xDomain;
    return this.margin.left + (v - d[0]) / (d[1] - d[0]) * this.pw;
  };
  Plot.prototype.y = function (v) {
    var d = this.yDomain;
    return this.margin.top + this.ph - (v - d[0]) / (d[1] - d[0]) * this.ph;
  };
  Plot.prototype.invX = function (px) {
    var d = this.xDomain;
    return d[0] + (px - this.margin.left) / this.pw * (d[1] - d[0]);
  };
  Plot.prototype.invY = function (py) {
    var d = this.yDomain;
    return d[0] + (this.margin.top + this.ph - py) / this.ph * (d[1] - d[0]);
  };

  /** 그리기를 플롯 영역 안으로 제한 */
  Plot.prototype.clip = function (fn) {
    var c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(this.margin.left, this.margin.top, this.pw, this.ph);
    c.clip();
    fn(c);
    c.restore();
  };

  /**
   * 축 그리기
   * o = {xTicks, yTicks, xFormat, yFormat, xLabel, yLabel, grid:true, yAxis:true}
   */
  Plot.prototype.axes = function (o) {
    o = o || {};
    var c = this.ctx, m = this.margin;
    var showY = o.yAxis !== false;
    var xt = o.xTicks || ticks(this.xDomain[0], this.xDomain[1], o.xTickCount || 6);
    var yt = o.yTicks || ticks(this.yDomain[0], this.yDomain[1], o.yTickCount || 4);
    var xf = o.xFormat || function (v) { return String(Math.round(v * 100) / 100); };
    var yf = o.yFormat || function (v) { return String(Math.round(v * 100) / 100); };

    c.save();
    c.font = '11px ' + FONT;
    c.lineWidth = 1;

    // 가로 격자
    if (o.grid !== false && showY) {
      c.strokeStyle = css('--grid');
      for (var i = 0; i < yt.length; i++) {
        var yy = Math.round(this.y(yt[i])) + 0.5;
        if (yy < m.top - 1 || yy > m.top + this.ph + 1) continue;
        c.beginPath();
        c.moveTo(m.left, yy);
        c.lineTo(m.left + this.pw, yy);
        c.stroke();
      }
    }

    // y 눈금 라벨
    if (showY) {
      c.fillStyle = css('--text-dim');
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      for (var j = 0; j < yt.length; j++) {
        var py = this.y(yt[j]);
        if (py < m.top - 1 || py > m.top + this.ph + 1) continue;
        c.fillText(yf(yt[j]), m.left - 7, py);
      }
    }

    // x축 선
    c.strokeStyle = css('--border');
    c.beginPath();
    var baseY = Math.round(m.top + this.ph) + 0.5;
    c.moveTo(m.left, baseY);
    c.lineTo(m.left + this.pw, baseY);
    c.stroke();

    // x 눈금
    c.fillStyle = css('--text-dim');
    c.textAlign = 'center';
    c.textBaseline = 'top';
    for (var k = 0; k < xt.length; k++) {
      var px = this.x(xt[k]);
      if (px < m.left - 1 || px > m.left + this.pw + 1) continue;
      c.beginPath();
      c.moveTo(Math.round(px) + 0.5, baseY);
      c.lineTo(Math.round(px) + 0.5, baseY + 4);
      c.stroke();
      c.fillText(xf(xt[k]), px, baseY + 7);
    }

    if (o.xLabel) {
      c.textAlign = 'right';
      c.fillText(o.xLabel, m.left + this.pw, baseY + 7);
    }
    if (o.yLabel) {
      c.save();
      c.translate(11, m.top + this.ph / 2);
      c.rotate(-Math.PI / 2);
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillText(o.yLabel, 0, 0);
      c.restore();
    }
    c.restore();
  };

  /** 데이터 좌표 점들을 선으로 잇기. pts = [[x,y], ...] */
  Plot.prototype.path = function (pts, o) {
    o = o || {};
    if (pts.length < 2) return;
    var c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(this.margin.left, this.margin.top, this.pw, this.ph);
    c.clip();
    c.strokeStyle = o.color || css('--accent');
    c.lineWidth = o.width || 2;
    c.lineJoin = 'round';
    if (o.dash) c.setLineDash(o.dash);
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    c.beginPath();
    c.moveTo(this.x(pts[0][0]), this.y(pts[0][1]));
    for (var i = 1; i < pts.length; i++) c.lineTo(this.x(pts[i][0]), this.y(pts[i][1]));
    c.stroke();
    c.restore();
  };

  /** 곡선 아래 면적 채우기. from/to 를 주면 그 구간만. */
  Plot.prototype.areaUnder = function (pts, o) {
    o = o || {};
    var sel = pts;
    if (o.from !== undefined || o.to !== undefined) {
      var lo = (o.from === undefined) ? -Infinity : o.from;
      var hi = (o.to === undefined) ? Infinity : o.to;
      sel = pts.filter(function (p) { return p[0] >= lo && p[0] <= hi; });
    }
    if (sel.length < 2) return;
    var c = this.ctx;
    var y0 = this.y(Math.max(this.yDomain[0], 0));
    c.save();
    c.beginPath();
    c.rect(this.margin.left, this.margin.top, this.pw, this.ph);
    c.clip();
    c.fillStyle = o.color || css('--accent-soft');
    c.beginPath();
    c.moveTo(this.x(sel[0][0]), y0);
    for (var i = 0; i < sel.length; i++) c.lineTo(this.x(sel[i][0]), this.y(sel[i][1]));
    c.lineTo(this.x(sel[sel.length - 1][0]), y0);
    c.closePath();
    c.fill();
    c.restore();
  };

  /** 히스토그램 막대. items = [{x0,x1,y}] */
  Plot.prototype.bars = function (items, o) {
    o = o || {};
    var c = this.ctx;
    var y0 = this.y(this.yDomain[0]);
    c.save();
    c.beginPath();
    c.rect(this.margin.left, this.margin.top - 2, this.pw, this.ph + 2);
    c.clip();
    c.fillStyle = o.color || css('--accent-soft');
    c.strokeStyle = o.stroke || css('--accent');
    c.lineWidth = o.lineWidth === undefined ? 1 : o.lineWidth;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!(it.y > this.yDomain[0])) continue;
      var px = this.x(it.x0);
      var pw = Math.max(1, this.x(it.x1) - px);
      var py = this.y(it.y);
      var gap = (o.gap === undefined) ? 0.5 : o.gap;
      c.fillRect(px + gap, py, Math.max(0.5, pw - gap * 2), y0 - py);
      if (c.lineWidth > 0) c.strokeRect(px + gap, py, Math.max(0.5, pw - gap * 2), y0 - py);
    }
    c.restore();
  };

  Plot.prototype.dot = function (x, y, o) {
    o = o || {};
    var c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(this.margin.left - 6, this.margin.top - 6, this.pw + 12, this.ph + 12);
    c.clip();
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    c.fillStyle = o.color || css('--accent');
    c.beginPath();
    c.arc(this.x(x), this.y(y), o.r || 3.5, 0, Math.PI * 2);
    c.fill();
    if (o.stroke) {
      c.strokeStyle = o.stroke;
      c.lineWidth = o.strokeWidth || 1.5;
      c.stroke();
    }
    c.restore();
  };

  Plot.prototype.vline = function (x, o) {
    o = o || {};
    var c = this.ctx;
    var px = Math.round(this.x(x)) + 0.5;
    if (px < this.margin.left - 1 || px > this.margin.left + this.pw + 1) return;
    c.save();
    c.strokeStyle = o.color || css('--text');
    c.lineWidth = o.width || 2;
    if (o.dash) c.setLineDash(o.dash);
    c.beginPath();
    c.moveTo(px, this.margin.top + (o.top || 0));
    c.lineTo(px, this.margin.top + this.ph);
    c.stroke();
    c.setLineDash([]);
    if (o.label) {
      c.font = (o.bold === false ? '' : '700 ') + '11.5px ' + FONT;
      var tw = c.measureText(o.label).width;
      var lx = clamp(px, this.margin.left + tw / 2 + 3, this.margin.left + this.pw - tw / 2 - 3);
      var ly = this.margin.top + (o.labelY || 2);
      c.fillStyle = css('--bg');
      c.fillRect(lx - tw / 2 - 4, ly - 1, tw + 8, 15);
      c.fillStyle = o.color || css('--text');
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillText(o.label, lx, ly);
    }
    c.restore();
  };

  Plot.prototype.hline = function (y, o) {
    o = o || {};
    var c = this.ctx;
    var py = Math.round(this.y(y)) + 0.5;
    c.save();
    c.strokeStyle = o.color || css('--text-dim');
    c.lineWidth = o.width || 1.5;
    if (o.dash) c.setLineDash(o.dash);
    c.beginPath();
    c.moveTo(this.margin.left, py);
    c.lineTo(this.margin.left + this.pw, py);
    c.stroke();
    c.restore();
  };

  /** 데이터 좌표 사각형 */
  Plot.prototype.rect = function (x0, y0, x1, y1, o) {
    o = o || {};
    var c = this.ctx;
    var px = this.x(Math.min(x0, x1)), py = this.y(Math.max(y0, y1));
    var pw = Math.abs(this.x(x1) - this.x(x0));
    var ph = Math.abs(this.y(y1) - this.y(y0));
    c.save();
    c.beginPath();
    c.rect(this.margin.left, this.margin.top, this.pw, this.ph);
    c.clip();
    if (o.fill) { c.fillStyle = o.fill; c.fillRect(px, py, pw, ph); }
    if (o.stroke) {
      c.strokeStyle = o.stroke;
      c.lineWidth = o.lineWidth || 1;
      if (o.dash) c.setLineDash(o.dash);
      c.strokeRect(px, py, pw, ph);
    }
    c.restore();
  };

  /** 픽셀 오프셋을 곁들인 텍스트 (데이터 좌표 기준) */
  Plot.prototype.text = function (x, y, str, o) {
    o = o || {};
    var c = this.ctx;
    c.save();
    c.font = (o.weight || '600') + ' ' + (o.size || 12) + 'px ' + FONT;
    c.fillStyle = o.color || css('--text');
    c.textAlign = o.align || 'center';
    c.textBaseline = o.baseline || 'bottom';
    if (o.bg) {
      var tw = c.measureText(str).width;
      var sz = (o.size || 12);
      var bx = this.x(x) + (o.dx || 0);
      var by = this.y(y) + (o.dy || 0);
      var ax = o.align === 'left' ? 0 : (o.align === 'right' ? -tw : -tw / 2);
      var ay = o.baseline === 'top' ? 0 : -sz - 2;
      c.fillStyle = o.bg;
      c.fillRect(bx + ax - 4, by + ay - 1, tw + 8, sz + 6);
      c.fillStyle = o.color || css('--text');
    }
    c.fillText(str, this.x(x) + (o.dx || 0), this.y(y) + (o.dy || 0));
    c.restore();
  };

  /* ---------------------------------------------------------
     10. 애니메이션 루프
     --------------------------------------------------------- */
  function Loop(step) {
    this.step = step;
    this.running = false;
    this._raf = null;
    this._last = 0;
  }

  Loop.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this;
    this._last = performance.now();
    (function tick(t) {
      if (!self.running) return;
      var dt = Math.min(120, t - self._last);
      self._last = t;
      self.step(dt);
      self._raf = requestAnimationFrame(tick);
    })(performance.now());
  };

  Loop.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  Loop.prototype.toggle = function () {
    if (this.running) this.stop(); else this.start();
    return this.running;
  };

  /* ---------------------------------------------------------
     11. DOM 편의 함수
     --------------------------------------------------------- */
  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setText(sel, v) {
    var n = el(sel);
    if (n) n.textContent = v;
  }

  /**
   * 슬라이더 바인딩: 값 표시 + 콜백
   * @param {string} id   input[type=range] 의 id
   * @param {function} cb (숫자값) => void
   * @param {function} [fmtFn] 표시용 포맷터
   */
  function range(id, cb, fmtFn) {
    var input = document.getElementById(id);
    var out = document.getElementById(id + '-val');
    function update() {
      var v = parseFloat(input.value);
      if (out) out.textContent = fmtFn ? fmtFn(v) : input.value;
      if (cb) cb(v);
    }
    input.addEventListener('input', update);
    update();
    return {
      input: input,
      get: function () { return parseFloat(input.value); },
      set: function (v) { input.value = v; update(); }
    };
  }

  /** 버튼 클릭 바인딩 */
  function click(id, cb) {
    var n = document.getElementById(id);
    if (n) n.addEventListener('click', cb);
    return n;
  }

  /** 라디오 그룹 바인딩 */
  function radios(name, cb) {
    var list = els('input[name="' + name + '"]');
    list.forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) cb(r.value); });
    });
    var checked = list.filter(function (r) { return r.checked; })[0];
    return { get: function () { return checked ? checked.value : (list[0] && list[0].value); } };
  }

  /** 체크박스 바인딩 */
  function check(id, cb) {
    var n = document.getElementById(id);
    if (n) n.addEventListener('change', function () { cb(n.checked); });
    return { get: function () { return n && n.checked; } };
  }

  /* ---------------------------------------------------------
     노출
     --------------------------------------------------------- */
  global.V = {
    PARAMS: PARAMS, EMBED: EMBED, VIEW: VIEW,
    css: css, clearColorCache: clearColorCache,
    onRedraw: onRedraw, redrawAll: redrawAll, reportHeight: reportHeight,
    Rng: Rng, Plot: Plot, Loop: Loop,
    erf: erf, normalPdf: normalPdf, normalCdf: normalCdf, normalQuantile: normalQuantile,
    clamp: clamp, lerp: lerp, fmt: fmt, ticks: ticks,
    S: S, POPS: POPS,
    fitCanvas: fitCanvas, pointerPos: pointerPos, FONT: FONT,
    el: el, els: els, setText: setText, range: range, click: click, radios: radios, check: check
  };
})(window);
