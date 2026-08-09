/* =========================================================
   calc.js — 미적분 시각화 도구

   viz.js 위에 얹는다. viz.js 의 Plot 은 "데이터를 그리는" 도구라
   축 배율이 x·y 서로 달라도 된다. 미적분에서는 그래도 괜찮다 —
   중요한 건 각도가 아니라 "높이가 곧 기울기다", "이만큼이 넓이다"
   같은 관계이기 때문이다. 다만 접선의 기울기를 눈으로 읽어야 하는
   그림에서는 equal:true 를 주어 등축으로 바꿀 수 있게 해뒀다.

   제공하는 것
     · Graph — 함수 그래프판. 곡선·접선·할선·리만합·면적·기울기삼각형
     · dragX — 캔버스를 가로로 끌어 x 값을 고르는 조작
     · F     — 수치 미분·적분과 자주 쓰는 함수 모음
   ========================================================= */
(function (global) {
  'use strict';

  var V = global.V;
  if (!V) throw new Error('calc.js 는 viz.js 다음에 불러와야 합니다.');

  var css = V.css;
  var FONT = V.FONT;

  /* ---------------------------------------------------------
     1. 수치 도구
        해석적으로 미분식을 따로 넘기지 않아도 되도록,
        기울기와 넓이를 전부 수치로 구한다.
     --------------------------------------------------------- */
  var F = {
    /** 중앙차분 도함수 — 한쪽 차분보다 오차가 훨씬 작다 */
    deriv: function (f, x, h) {
      h = h || 1e-5;
      return (f(x + h) - f(x - h)) / (2 * h);
    },
    /** 2계 도함수 (곡률을 그릴 때 쓴다) */
    deriv2: function (f, x, h) {
      h = h || 1e-4;
      return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
    },
    /** 심프슨 적분 — n 은 짝수여야 한다 */
    integral: function (f, a, b, n) {
      n = n || 400;
      if (n % 2) n++;
      var h = (b - a) / n, s = f(a) + f(b);
      for (var i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
      return s * h / 3;
    },
    /** 리만 합. mode = 'left' | 'right' | 'mid' */
    riemannSum: function (f, a, b, n, mode) {
      var dx = (b - a) / n, s = 0;
      for (var i = 0; i < n; i++) {
        var x = mode === 'right' ? a + (i + 1) * dx
              : mode === 'mid'   ? a + (i + 0.5) * dx
              :                    a + i * dx;
        s += f(x) * dx;
      }
      return s;
    },
    fact: function (n) {
      var r = 1;
      for (var i = 2; i <= n; i++) r *= i;
      return r;
    },
    /** 유한한 실수인가 — 특이점을 건너뛸 때 쓴다 */
    ok: function (v) { return typeof v === 'number' && isFinite(v); }
  };

  /** 숫자를 짧게. 화면에 0.30000000004 가 뜨는 것을 막는다 */
  function num(v, d) {
    if (d === undefined) d = 2;
    if (!isFinite(v)) return '—';
    var s = (Math.abs(v) < 5e-4 ? 0 : v).toFixed(d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  }

  /* ---------------------------------------------------------
     2. Graph — 함수 그래프판
     --------------------------------------------------------- */
  function Graph(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.xDomain = (opts.xDomain || [-1, 1]).slice();
    this.yDomain = (opts.yDomain || [-1, 1]).slice();
    this.equal = !!opts.equal;          // 등축(각도가 의미를 가질 때)
    this.plot = new V.Plot(canvas, {
      height: opts.height || function (w) { return Math.round(Math.max(240, Math.min(380, w * 0.62))); },
      margin: Object.assign({ top: 22, right: 20, bottom: 34, left: 46 }, opts.margin || {}),
      xDomain: this.xDomain,
      yDomain: this.yDomain
    });
  }

  /** 매 프레임 맨 처음 호출 */
  Graph.prototype.begin = function () {
    var p = this.plot;
    p.xDomain = this.xDomain.slice();
    p.yDomain = this.yDomain.slice();
    p.begin();
    if (this.equal) {
      // 픽셀당 단위를 두 축에서 같게. 짧은 쪽 기준으로 긴 쪽을 넓힌다.
      var sx = p.pw / (p.xDomain[1] - p.xDomain[0]);
      var sy = p.ph / (p.yDomain[1] - p.yDomain[0]);
      var s = Math.min(sx, sy);
      var cx = (p.xDomain[0] + p.xDomain[1]) / 2;
      var cy = (p.yDomain[0] + p.yDomain[1]) / 2;
      p.xDomain = [cx - p.pw / (2 * s), cx + p.pw / (2 * s)];
      p.yDomain = [cy - p.ph / (2 * s), cy + p.ph / (2 * s)];
    }
    this.ctx = p.ctx;
    this.w = p.w; this.h = p.h;
    return this;
  };

  Graph.prototype.px = function (v) { return this.plot.x(v); };
  Graph.prototype.py = function (v) { return this.plot.y(v); };
  Graph.prototype.ux = function (q) { return this.plot.invX(q); };
  Graph.prototype.uy = function (q) { return this.plot.invY(q); };
  Graph.prototype.at = function (ev) {
    var q = V.pointerPos(this.canvas, ev);
    return [this.ux(q.x), this.uy(q.y)];
  };

  /** 그리기를 그래프 영역 안으로 제한 */
  Graph.prototype.inside = function (fn) {
    var p = this.plot, c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(p.margin.left, p.margin.top, p.pw, p.ph);
    c.clip();
    fn(c);
    c.restore();
  };

  /**
   * 원점을 지나는 x·y 축 + 격자.
   * o = {xStep, yStep, grid:true, xLabel, yLabel, labels:true, xFormat, yFormat}
   */
  Graph.prototype.axes = function (o) {
    o = o || {};
    var p = this.plot, c = this.ctx, m = p.margin;
    var xd = p.xDomain, yd = p.yDomain;
    var xStep = o.xStep || niceStep(xd[1] - xd[0]);
    var yStep = o.yStep || niceStep(yd[1] - yd[0]);
    var xf = o.xFormat || function (v) { return num(v, 3); };
    var yf = o.yFormat || function (v) { return num(v, 3); };

    c.save();
    c.font = '11px ' + FONT;
    c.lineWidth = 1;

    if (o.grid !== false) {
      c.strokeStyle = css('--grid');
      c.beginPath();
      for (var gx = Math.ceil(xd[0] / xStep) * xStep; gx <= xd[1] + 1e-9; gx += xStep) {
        var X = Math.round(p.x(gx)) + 0.5;
        c.moveTo(X, m.top); c.lineTo(X, m.top + p.ph);
      }
      for (var gy = Math.ceil(yd[0] / yStep) * yStep; gy <= yd[1] + 1e-9; gy += yStep) {
        var Y = Math.round(p.y(gy)) + 0.5;
        c.moveTo(m.left, Y); c.lineTo(m.left + p.pw, Y);
      }
      c.stroke();
    }

    // 축 — 원점이 화면 밖이면 가장자리에 붙인다
    var ax = V.clamp(p.y(0), m.top, m.top + p.ph);
    var ay = V.clamp(p.x(0), m.left, m.left + p.pw);
    c.strokeStyle = css('--text-dim');
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(m.left, Math.round(ax) + 0.5); c.lineTo(m.left + p.pw, Math.round(ax) + 0.5);
    c.moveTo(Math.round(ay) + 0.5, m.top);  c.lineTo(Math.round(ay) + 0.5, m.top + p.ph);
    c.stroke();

    if (o.labels !== false) {
      c.fillStyle = css('--text-dim');
      c.textAlign = 'center';
      c.textBaseline = 'top';
      for (var lx = Math.ceil(xd[0] / xStep) * xStep; lx <= xd[1] + 1e-9; lx += xStep) {
        if (Math.abs(lx) < xStep * 1e-6) continue;
        var pxv = p.x(lx);
        if (pxv < m.left + 8 || pxv > m.left + p.pw - 8) continue;
        c.fillText(xf(lx), pxv, ax + 5);
      }
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      for (var ly = Math.ceil(yd[0] / yStep) * yStep; ly <= yd[1] + 1e-9; ly += yStep) {
        if (Math.abs(ly) < yStep * 1e-6) continue;
        var pyv = p.y(ly);
        if (pyv < m.top + 7 || pyv > m.top + p.ph - 7) continue;
        c.fillText(yf(ly), ay - 6, pyv);
      }
    }

    c.fillStyle = css('--text-dim');
    c.font = '600 12px ' + FONT;
    if (o.xLabel) {
      // 눈금 숫자보다 한 줄 아래에 둔다 — 같은 줄에 두면 마지막 눈금과 겹친다
      c.textAlign = 'right'; c.textBaseline = 'top';
      c.fillText(o.xLabel, m.left + p.pw, m.top + p.ph + 19);
    }
    if (o.yLabel) {
      c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText(o.yLabel, m.left + 2, m.top - 6);
    }
    c.restore();
    return this;
  };

  /**
   * 함수 곡선. f 는 (x)=>y.
   * o = {color, width, dash, alpha, from, to, samples, label, labelAt}
   * 값이 유한하지 않거나 화면을 크게 벗어나면 선을 끊는다 (1/x 의 점근선 대비).
   */
  Graph.prototype.curve = function (f, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var a = o.from === undefined ? p.xDomain[0] : o.from;
    var b = o.to === undefined ? p.xDomain[1] : o.to;
    var n = o.samples || Math.max(160, Math.round(p.pw));
    var lo = p.yDomain[0] - (p.yDomain[1] - p.yDomain[0]) * 3;
    var hi = p.yDomain[1] + (p.yDomain[1] - p.yDomain[0]) * 3;

    c.save();
    c.beginPath();
    c.rect(p.margin.left, p.margin.top, p.pw, p.ph);
    c.clip();
    c.strokeStyle = o.color || css('--accent');
    c.lineWidth = o.width || 2.4;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    if (o.dash) c.setLineDash(o.dash);
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;

    c.beginPath();
    var pen = false;
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n;
      var y = f(x);
      if (!F.ok(y) || y < lo || y > hi) { pen = false; continue; }
      var X = p.x(x), Y = p.y(y);
      if (pen) c.lineTo(X, Y); else { c.moveTo(X, Y); pen = true; }
    }
    c.stroke();
    c.restore();

    if (o.label) {
      var lx = o.labelAt === undefined ? a + (b - a) * 0.82 : o.labelAt;
      var ly = f(lx);
      if (F.ok(ly)) {
        this.text(lx, ly, o.label, {
          color: o.color || css('--accent'),
          dy: o.labelDy === undefined ? -9 : o.labelDy,
          bg: css('--surface')
        });
      }
    }
    return this;
  };

  /** 곡선 아래(위) 부호 있는 면적. y=0 을 바닥으로 채운다 */
  Graph.prototype.area = function (f, a, b, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var n = o.samples || 240;
    var y0 = p.y(V.clamp(0, p.yDomain[0], p.yDomain[1]));
    c.save();
    c.beginPath();
    c.rect(p.margin.left, p.margin.top, p.pw, p.ph);
    c.clip();
    c.fillStyle = o.color || css('--accent-soft');
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    c.beginPath();
    c.moveTo(p.x(a), y0);
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n;
      var y = f(x);
      if (!F.ok(y)) y = 0;
      c.lineTo(p.x(x), p.y(y));
    }
    c.lineTo(p.x(b), y0);
    c.closePath();
    c.fill();
    if (o.stroke) {
      c.strokeStyle = o.stroke;
      c.lineWidth = o.lineWidth || 1.2;
      c.stroke();
    }
    c.restore();
    return this;
  };

  /**
   * 리만 직사각형.
   * o = {mode:'left'|'right'|'mid', fill, stroke, alpha, showTops}
   */
  Graph.prototype.riemann = function (f, a, b, n, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var dx = (b - a) / n;
    var base = V.clamp(0, p.yDomain[0], p.yDomain[1]);
    var y0 = p.y(base);
    var mode = o.mode || 'left';
    c.save();
    c.beginPath();
    c.rect(p.margin.left, p.margin.top - 40, p.pw, p.ph + 40);
    c.clip();
    c.fillStyle = o.fill || css('--accent-soft');
    c.strokeStyle = o.stroke || css('--accent');
    c.lineWidth = o.lineWidth === undefined ? 1 : o.lineWidth;
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    for (var i = 0; i < n; i++) {
      var xs = a + i * dx;
      var xm = mode === 'right' ? xs + dx : mode === 'mid' ? xs + dx / 2 : xs;
      var h = f(xm);
      if (!F.ok(h)) continue;
      var X = p.x(xs), Wpx = p.x(xs + dx) - X;
      var Y = p.y(h);
      c.fillRect(X, Math.min(Y, y0), Wpx, Math.abs(y0 - Y));
      if (c.lineWidth > 0) c.strokeRect(X, Math.min(Y, y0), Wpx, Math.abs(y0 - Y));
    }
    c.restore();
    return this;
  };

  /** 데이터 좌표 두 점을 잇는 선분 */
  Graph.prototype.segment = function (x0, y0, x1, y1, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    c.save();
    if (o.clip !== false) {
      c.beginPath();
      c.rect(p.margin.left, p.margin.top, p.pw, p.ph);
      c.clip();
    }
    c.strokeStyle = o.color || css('--text');
    c.lineWidth = o.width || 2;
    c.lineCap = 'round';
    if (o.dash) c.setLineDash(o.dash);
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    c.beginPath();
    c.moveTo(p.x(x0), p.y(y0));
    c.lineTo(p.x(x1), p.y(y1));
    c.stroke();
    c.restore();
    return this;
  };

  /** 점 (x0,y0) 을 지나고 기울기 s 인 직선을 화면 끝까지 */
  Graph.prototype.lineAt = function (x0, y0, s, o) {
    o = o || {};
    var p = this.plot;
    var a = p.xDomain[0], b = p.xDomain[1];
    if (o.span !== undefined) { a = x0 - o.span; b = x0 + o.span; }
    this.segment(a, y0 + s * (a - x0), b, y0 + s * (b - x0), o);
    if (o.label) {
      var lx = o.labelAt === undefined ? a + (b - a) * 0.14 : o.labelAt;
      this.text(lx, y0 + s * (lx - x0), o.label, {
        color: o.color || css('--text'), dy: o.labelDy === undefined ? -8 : o.labelDy,
        bg: css('--surface')
      });
    }
    return this;
  };

  /** 접선 — f 의 x0 에서의 기울기를 수치로 구해 긋는다 */
  Graph.prototype.tangent = function (f, x0, o) {
    o = o || {};
    var s = o.slope === undefined ? F.deriv(f, x0) : o.slope;
    this.lineAt(x0, f(x0), s, o);
    return s;
  };

  /** 할선 — (a, f(a)) 와 (b, f(b)) 를 잇는다. 기울기를 돌려준다 */
  Graph.prototype.secant = function (f, a, b, o) {
    o = o || {};
    var ya = f(a), yb = f(b);
    var s = (yb - ya) / (b - a);
    if (o.extend === false) this.segment(a, ya, b, yb, o);
    else this.lineAt(a, ya, s, o);
    return s;
  };

  /**
   * 기울기 삼각형 — dy/dx 가 '작은 직각삼각형의 세로÷가로'임을 보여준다.
   * o = {color, dxLabel, dyLabel, fill}
   */
  Graph.prototype.slopeTriangle = function (x0, y0, dx, slope, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var x1 = x0 + dx, y1 = y0 + slope * dx;
    var col = o.color || css('--purple');
    c.save();
    c.beginPath();
    c.rect(p.margin.left, p.margin.top, p.pw, p.ph);
    c.clip();
    c.beginPath();
    c.moveTo(p.x(x0), p.y(y0));
    c.lineTo(p.x(x1), p.y(y0));
    c.lineTo(p.x(x1), p.y(y1));
    c.closePath();
    c.fillStyle = o.fill || css('--purple-soft');
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();

    if (o.dxLabel) {
      this.text((x0 + x1) / 2, y0, o.dxLabel, { color: col, dy: 15, size: 11.5, bg: o.bg || css('--surface') });
    }
    if (o.dyLabel) {
      this.text(x1, (y0 + y1) / 2, o.dyLabel, {
        color: col, dx: 8, align: 'left', baseline: 'middle', size: 11.5, bg: o.bg || css('--surface')
      });
    }
    return this;
  };

  /** 데이터 좌표 다각형 */
  Graph.prototype.poly = function (pts, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    if (pts.length < 2) return this;
    c.save();
    if (o.clip !== false) {
      c.beginPath();
      c.rect(p.margin.left, p.margin.top, p.pw, p.ph);
      c.clip();
    }
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    c.beginPath();
    c.moveTo(p.x(pts[0][0]), p.y(pts[0][1]));
    for (var i = 1; i < pts.length; i++) c.lineTo(p.x(pts[i][0]), p.y(pts[i][1]));
    if (o.close !== false) c.closePath();
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.stroke) {
      c.strokeStyle = o.stroke;
      c.lineWidth = o.width || 1.5;
      if (o.dash) c.setLineDash(o.dash);
      c.stroke();
    }
    c.restore();
    return this;
  };

  /** 데이터 좌표 원 */
  Graph.prototype.circle = function (cx, cy, r, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var rx = Math.abs(p.x(cx + r) - p.x(cx));
    var ry = Math.abs(p.y(cy + r) - p.y(cy));
    c.save();
    if (o.clip !== false) {
      c.beginPath();
      c.rect(p.margin.left, p.margin.top, p.pw, p.ph);
      c.clip();
    }
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    c.beginPath();
    c.ellipse(p.x(cx), p.y(cy), rx, ry, 0, o.a0 || 0, o.a1 === undefined ? Math.PI * 2 : o.a1);
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.stroke) {
      c.strokeStyle = o.stroke;
      c.lineWidth = o.width || 1.5;
      if (o.dash) c.setLineDash(o.dash);
      c.stroke();
    }
    c.restore();
    return this;
  };

  Graph.prototype.dot = function (x, y, o) { this.plot.dot(x, y, o); return this; };
  Graph.prototype.text = function (x, y, s, o) { this.plot.text(x, y, s, o); return this; };
  Graph.prototype.rect = function (x0, y0, x1, y1, o) { this.plot.rect(x0, y0, x1, y1, o); return this; };

  /** 세로 안내선 (라벨은 위쪽에 얹는다) */
  Graph.prototype.vline = function (x, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var X = Math.round(p.x(x)) + 0.5;
    if (X < p.margin.left - 1 || X > p.margin.left + p.pw + 1) return this;
    c.save();
    c.strokeStyle = o.color || css('--text-dim');
    c.lineWidth = o.width || 1.4;
    if (o.dash !== null) c.setLineDash(o.dash || [5, 4]);
    c.beginPath();
    var top = o.y0 === undefined ? p.margin.top : p.y(o.y0);
    var bot = o.y1 === undefined ? p.margin.top + p.ph : p.y(o.y1);
    c.moveTo(X, top); c.lineTo(X, bot);
    c.stroke();
    c.restore();
    if (o.label) {
      c.save();
      c.font = '700 11.5px ' + FONT;
      var tw = c.measureText(o.label).width;
      var lx = V.clamp(X, p.margin.left + tw / 2 + 3, p.margin.left + p.pw - tw / 2 - 3);
      var ly = p.margin.top + (o.labelY || 1);
      c.fillStyle = css('--surface');
      c.fillRect(lx - tw / 2 - 4, ly - 1, tw + 8, 15);
      c.fillStyle = o.color || css('--text');
      c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillText(o.label, lx, ly);
      c.restore();
    }
    return this;
  };

  Graph.prototype.hline = function (y, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var Y = Math.round(p.y(y)) + 0.5;
    if (Y < p.margin.top - 1 || Y > p.margin.top + p.ph + 1) return this;
    c.save();
    c.strokeStyle = o.color || css('--text-dim');
    c.lineWidth = o.width || 1.4;
    if (o.dash !== null) c.setLineDash(o.dash || [5, 4]);
    c.beginPath();
    c.moveTo(o.x0 === undefined ? p.margin.left : p.x(o.x0), Y);
    c.lineTo(o.x1 === undefined ? p.margin.left + p.pw : p.x(o.x1), Y);
    c.stroke();
    c.restore();
    if (o.label) {
      this.text(o.labelAt === undefined ? p.xDomain[0] : o.labelAt, y, o.label, {
        color: o.color || css('--text-dim'), align: 'left', dx: 6, dy: -4,
        size: 11.5, bg: css('--surface')
      });
    }
    return this;
  };

  /** 끌 수 있는 점 표시 */
  Graph.prototype.handle = function (x, y, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    c.save();
    c.beginPath();
    c.arc(p.x(x), p.y(y), o.r || 6.5, 0, Math.PI * 2);
    c.fillStyle = o.color || css('--accent');
    c.fill();
    c.strokeStyle = css('--surface');
    c.lineWidth = 2.4;
    c.stroke();
    c.restore();
    return this;
  };

  /** 캔버스 위 픽셀 좌표로 범례를 얹는다. items = [{color, text, dash}] */
  Graph.prototype.legend = function (items, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var x = o.x === undefined ? p.margin.left + 8 : o.x;
    var y = o.y === undefined ? p.margin.top + 6 : o.y;
    c.save();
    c.font = '11.5px ' + FONT;
    var wMax = 0;
    items.forEach(function (it) { wMax = Math.max(wMax, c.measureText(it.text).width); });
    var boxW = wMax + 34, boxH = items.length * 17 + 10;
    c.globalAlpha = 0.92;
    c.fillStyle = css('--surface');
    c.fillRect(x, y, boxW, boxH);
    c.globalAlpha = 1;
    c.strokeStyle = css('--border');
    c.lineWidth = 1;
    c.strokeRect(x + 0.5, y + 0.5, boxW, boxH);
    items.forEach(function (it, i) {
      var cy = y + 14 + i * 17;
      c.strokeStyle = it.color;
      c.lineWidth = 2.6;
      if (it.dash) c.setLineDash(it.dash); else c.setLineDash([]);
      c.beginPath();
      c.moveTo(x + 8, cy); c.lineTo(x + 24, cy);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = css('--text-dim');
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText(it.text, x + 29, cy);
    });
    c.restore();
    return this;
  };

  /* ---------------------------------------------------------
     3. 가로로 끌기 — x 값 하나를 마우스/손가락으로 고르는 조작
     --------------------------------------------------------- */
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Graph} g
   * @param {function} onMove  (x) => void.  캔버스를 누르거나 끌 때마다 호출
   * @param {object} [o]  {min, max}  x 를 이 범위로 자른다
   */
  function dragX(canvas, g, onMove, o) {
    o = o || {};
    var active = false;

    function send(ev) {
      var q = V.pointerPos(canvas, ev);
      var x = g.ux(q.x);
      if (o.min !== undefined) x = Math.max(o.min, x);
      if (o.max !== undefined) x = Math.min(o.max, x);
      onMove(x, g.uy(q.y));
    }
    function down(ev) {
      active = true;
      canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
      send(ev);
      ev.preventDefault();
    }
    function move(ev) {
      if (!active) return;
      send(ev);
      ev.preventDefault();
    }
    function up() { active = false; }

    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'ew-resize';
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return { isDragging: function () { return active; } };
  }

  /* 격자 간격을 사람이 읽기 좋은 값으로 */
  function niceStep(span) {
    var raw = span / 8;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var n = raw / mag;
    var mult = n >= 5 ? 5 : n >= 2 ? 2 : 1;
    return mult * mag;
  }

  global.CA = {
    Graph: Graph,
    dragX: dragX,
    F: F,
    num: num,
    niceStep: niceStep
  };
})(window);
