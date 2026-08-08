/* =========================================================
   linalg.js — 선형대수 시각화 도구

   viz.js 위에 얹는다. viz.js 의 Plot 은 x·y 축 배율이 서로 달라도
   되는 통계용 도구지만, 선형대수에서는 그러면 안 된다. 각도가 90도인지,
   두 벡터의 길이가 같은지가 그림의 내용 자체이기 때문이다.
   그래서 Board 는 픽셀당 단위를 두 축에서 강제로 같게 맞춘다(등축).

   제공하는 것
     · Board  — 원점 중심 등축 좌표판, 격자·화살표·평행사변형·Span
     · drag   — 벡터 끝을 마우스/손가락으로 끌기
     · M      — 2×2 중심의 작은 행렬 계산기 (행렬식, 역행렬, 고유값, SVD)
   ========================================================= */
(function (global) {
  'use strict';

  var V = global.V;
  if (!V) throw new Error('linalg.js 는 viz.js 다음에 불러와야 합니다.');

  var css = V.css;
  var FONT = V.FONT;

  /* ---------------------------------------------------------
     1. 작은 행렬 계산기
         벡터는 [x, y], 2×2 행렬은 [[a, b], [c, d]] (행 우선)
     --------------------------------------------------------- */
  var M = {
    /** 행렬 × 벡터 */
    mv: function (A, v) {
      return [A[0][0] * v[0] + A[0][1] * v[1],
              A[1][0] * v[0] + A[1][1] * v[1]];
    },
    /** 행렬 × 행렬 */
    mul: function (A, B) {
      return [
        [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
        [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
      ];
    },
    T: function (A) { return [[A[0][0], A[1][0]], [A[0][1], A[1][1]]]; },
    det: function (A) { return A[0][0] * A[1][1] - A[0][1] * A[1][0]; },
    eye: function () { return [[1, 0], [0, 1]]; },
    rot: function (t) {
      return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
    },
    inv: function (A) {
      var d = M.det(A);
      if (Math.abs(d) < 1e-12) return null;      // 특이행렬
      return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]];
    },
    /** Ax = b 의 해. 특이행렬이면 null */
    solve: function (A, b) {
      var Ai = M.inv(A);
      return Ai ? M.mv(Ai, b) : null;
    },
    dot: function (u, v) { return u[0] * v[0] + u[1] * v[1]; },
    norm: function (v) { return Math.hypot(v[0], v[1]); },
    add: function (u, v) { return [u[0] + v[0], u[1] + v[1]]; },
    sub: function (u, v) { return [u[0] - v[0], u[1] - v[1]]; },
    scale: function (v, c) { return [v[0] * c, v[1] * c]; },
    unit: function (v) {
      var n = M.norm(v);
      return n < 1e-12 ? [0, 0] : [v[0] / n, v[1] / n];
    },

    /**
     * 2×2 실수 고유값·고유벡터.
     * 판별식이 음수면 복소수 고유값이므로 real:false 로 알려준다.
     * (복소 고유값은 '회전' 을 뜻한다 — 실수 고유벡터가 없다.)
     */
    eig: function (A) {
      var a = A[0][0], b = A[0][1], c = A[1][0], d = A[1][1];
      var tr = a + d, det = a * d - b * c;
      var disc = tr * tr / 4 - det;
      if (disc < -1e-12) {
        return { real: false, tr: tr, det: det };
      }
      var s = Math.sqrt(Math.max(0, disc));
      var l1 = tr / 2 + s, l2 = tr / 2 - s;
      return {
        real: true, values: [l1, l2],
        vectors: [eigVec(A, l1), eigVec(A, l2)]
      };
    },

    /**
     * 2×2 SVD. A = U Σ Vᵀ
     * AᵀA 의 고유분해로 V 와 σ 를 얻고, u_i = A v_i / σ_i 로 U 를 만든다.
     */
    svd: function (A) {
      var AtA = M.mul(M.T(A), A);
      var e = M.eig(AtA);                        // 대칭이라 항상 실수
      var lam = e.values.slice();
      var vec = e.vectors.slice();
      if (lam[0] < lam[1]) { lam.reverse(); vec.reverse(); }   // 내림차순
      var sig = [Math.sqrt(Math.max(0, lam[0])), Math.sqrt(Math.max(0, lam[1]))];
      var v1 = M.unit(vec[0]);
      var v2 = [-v1[1], v1[0]];                  // 대칭행렬이므로 직교 보장
      var u1 = sig[0] > 1e-9 ? M.scale(M.mv(A, v1), 1 / sig[0]) : [1, 0];
      var u2 = sig[1] > 1e-9 ? M.scale(M.mv(A, v2), 1 / sig[1]) : [-u1[1], u1[0]];
      return { U: [u1, u2], sigma: sig, V: [v1, v2] };
    }
  };

  /** (A − λI)x = 0 의 0 아닌 해 하나 */
  function eigVec(A, lam) {
    var a = A[0][0] - lam, b = A[0][1], c = A[1][0], d = A[1][1] - lam;
    // 두 행 중 크기가 큰 쪽에서 방향을 읽는다 (수치적으로 안전)
    var r1 = Math.hypot(a, b), r2 = Math.hypot(c, d);
    var v = r1 >= r2 ? [-b, a] : [-d, c];
    if (M.norm(v) < 1e-9) v = [1, 0];            // A = λI 인 경우
    return M.unit(v);
  }

  /* ---------------------------------------------------------
     2. 등축 좌표판
     --------------------------------------------------------- */
  function Board(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.range = opts.range || 5;                // 원점에서 ± 몇 칸까지 보일지
    this.minRange = opts.range || 5;
    this.center = opts.center || [0, 0];

    // 등축이므로 캔버스가 가로로 길면 x 쪽만 쓸데없이 넓어진다.
    // 기본을 정사각형으로 두어 두 축이 같은 범위를 보이게 한다.
    var h = opts.height;
    if (h === undefined) {
      h = function (cssW) { return Math.round(Math.max(300, cssW)); };
    }
    this.plot = new V.Plot(canvas, {
      height: h,
      margin: opts.margin || { top: 14, right: 14, bottom: 14, left: 14 }
    });
  }

  /**
   * 그릴 벡터들이 화면 안에 들어오도록 범위를 넓힌다.
   * 좁아지지는 않게 해서(minRange 하한) 격자가 들썩이지 않도록 한다.
   */
  Board.prototype.fit = function (vectors, pad) {
    var m = 0;
    (vectors || []).forEach(function (v) {
      if (!v) return;
      m = Math.max(m, Math.abs(v[0]), Math.abs(v[1]));
    });
    this.range = Math.max(this.minRange, Math.ceil(m * (pad || 1.18)));
    return this;
  };

  /** 매 프레임 처음에 호출. 등축이 되도록 domain 을 다시 계산한다. */
  Board.prototype.begin = function () {
    var p = this.plot;
    p.begin();
    var r = this.range;
    // 짧은 쪽이 ±range 를 담도록 픽셀/단위 배율을 정하고, 긴 쪽은 더 넓게 보여준다
    var scale = Math.min(p.pw, p.ph) / (2 * r);
    var hx = p.pw / (2 * scale), hy = p.ph / (2 * scale);
    p.xDomain = [this.center[0] - hx, this.center[0] + hx];
    p.yDomain = [this.center[1] - hy, this.center[1] + hy];
    this.scale = scale;
    this.ctx = p.ctx;
    return this;
  };

  Board.prototype.px = function (v) { return this.plot.x(v); };
  Board.prototype.py = function (v) { return this.plot.y(v); };
  Board.prototype.ux = function (p) { return this.plot.invX(p); };
  Board.prototype.uy = function (p) { return this.plot.invY(p); };
  /** 화면 좌표 → 수학 좌표 */
  Board.prototype.at = function (ev) {
    var q = V.pointerPos(this.canvas, ev);
    return [this.ux(q.x), this.uy(q.y)];
  };

  /** 격자와 축. o = {step, labels:true} */
  Board.prototype.grid = function (o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var step = o.step || 1;
    var x0 = p.xDomain[0], x1 = p.xDomain[1], y0 = p.yDomain[0], y1 = p.yDomain[1];

    c.save();
    c.lineWidth = 1;
    c.strokeStyle = css('--grid');
    c.beginPath();
    for (var gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) {
      var X = Math.round(p.x(gx)) + 0.5;
      c.moveTo(X, p.y(y0)); c.lineTo(X, p.y(y1));
    }
    for (var gy = Math.ceil(y0 / step) * step; gy <= y1; gy += step) {
      var Y = Math.round(p.y(gy)) + 0.5;
      c.moveTo(p.x(x0), Y); c.lineTo(p.x(x1), Y);
    }
    c.stroke();

    // 축은 굵게
    c.lineWidth = 1.6;
    c.strokeStyle = css('--border');
    c.beginPath();
    c.moveTo(p.x(x0), Math.round(p.y(0)) + 0.5); c.lineTo(p.x(x1), Math.round(p.y(0)) + 0.5);
    c.moveTo(Math.round(p.x(0)) + 0.5, p.y(y0)); c.lineTo(Math.round(p.x(0)) + 0.5, p.y(y1));
    c.stroke();

    if (o.labels !== false) {
      c.font = '500 10px ' + FONT;
      c.fillStyle = css('--text-dim');
      c.textAlign = 'center';
      c.textBaseline = 'top';
      for (var lx = Math.ceil(x0 / step) * step; lx <= x1; lx += step) {
        if (Math.abs(lx) < 1e-9) continue;
        c.fillText(fmtTick(lx), p.x(lx), p.y(0) + 4);
      }
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      for (var ly = Math.ceil(y0 / step) * step; ly <= y1; ly += step) {
        if (Math.abs(ly) < 1e-9) continue;
        c.fillText(fmtTick(ly), p.x(0) - 5, p.y(ly));
      }
    }
    c.restore();
    return this;
  };

  function fmtTick(v) {
    var r = Math.round(v);
    return Math.abs(v - r) < 1e-9 ? String(r) : String(Math.round(v * 10) / 10);
  }

  /**
   * 행렬 A 로 변형된 격자.
   * 원래 정수 격자선이 A 에 의해 어디로 가는지 보여준다 — 선형변환의 핵심 그림.
   */
  Board.prototype.transformedGrid = function (A, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var n = o.extent || 9;
    c.save();
    c.beginPath();
    c.rect(p.margin.left, p.margin.top, p.pw, p.ph);
    c.clip();
    c.lineWidth = o.width || 1.1;
    c.strokeStyle = o.color || css('--accent-soft');
    c.globalAlpha = o.alpha === undefined ? 0.9 : o.alpha;
    c.beginPath();
    for (var i = -n; i <= n; i++) {
      var a = M.mv(A, [i, -n]), b = M.mv(A, [i, n]);
      c.moveTo(p.x(a[0]), p.y(a[1])); c.lineTo(p.x(b[0]), p.y(b[1]));
      var d = M.mv(A, [-n, i]), e = M.mv(A, [n, i]);
      c.moveTo(p.x(d[0]), p.y(d[1])); c.lineTo(p.x(e[0]), p.y(e[1]));
    }
    c.stroke();
    c.restore();
    return this;
  };

  /**
   * 화살표(벡터). from 을 주면 그 점에서 출발한다(머리-꼬리 잇기용).
   * o = {color, width, label, dash, alpha, head}
   */
  Board.prototype.arrow = function (v, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var from = o.from || [0, 0];
    var x0 = p.x(from[0]), y0 = p.y(from[1]);
    var x1 = p.x(from[0] + v[0]), y1 = p.y(from[1] + v[1]);
    var dx = x1 - x0, dy = y1 - y0;
    var len = Math.hypot(dx, dy);

    c.save();
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    c.strokeStyle = o.color || css('--accent');
    c.fillStyle = o.color || css('--accent');
    c.lineWidth = o.width || 2.4;
    c.lineCap = 'round';
    if (o.dash) c.setLineDash(o.dash);

    if (len < 1) {                                // 영벡터는 점으로
      c.beginPath(); c.arc(x0, y0, 3, 0, Math.PI * 2); c.fill();
      c.restore();
      return this;
    }

    var head = Math.min(o.head || 11, len * 0.42);
    var ux = dx / len, uy = dy / len;
    // 화살촉이 겹치지 않게 몸통을 살짝 짧게
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1 - ux * head * 0.72, y1 - uy * head * 0.72);
    c.stroke();

    c.setLineDash([]);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 - ux * head - uy * head * 0.42, y1 - uy * head + ux * head * 0.42);
    c.lineTo(x1 - ux * head + uy * head * 0.42, y1 - uy * head - ux * head * 0.42);
    c.closePath();
    c.fill();

    if (o.label) {
      c.font = '700 12.5px ' + FONT;
      c.fillStyle = o.color || css('--accent');
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      var off = o.labelOff || 15;
      c.fillText(o.label, x1 + ux * off, y1 + uy * off);
    }
    c.restore();
    return this;
  };

  /** 두 벡터가 만드는 평행사변형 (선형결합·행렬식의 넓이) */
  Board.prototype.parallelogram = function (u, v, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var pts = [[0, 0], u, M.add(u, v), v];
    c.save();
    c.beginPath();
    pts.forEach(function (q, i) {
      var X = p.x(q[0]), Y = p.y(q[1]);
      if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
    });
    c.closePath();
    c.fillStyle = o.fill || css('--accent-soft');
    c.globalAlpha = o.alpha === undefined ? 0.5 : o.alpha;
    c.fill();
    if (o.stroke) {
      c.globalAlpha = 1;
      c.strokeStyle = o.stroke;
      c.lineWidth = o.width || 1.4;
      if (o.dash) c.setLineDash(o.dash);
      c.stroke();
    }
    c.restore();
    return this;
  };

  /** 벡터 하나가 생성하는 공간 = 원점을 지나는 직선 */
  Board.prototype.span = function (v, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    if (M.norm(v) < 1e-9) return this;
    var big = 1e4;
    var a = M.scale(v, -big), b = M.scale(v, big);
    c.save();
    c.beginPath();
    c.rect(p.margin.left, p.margin.top, p.pw, p.ph);
    c.clip();
    c.strokeStyle = o.color || css('--accent');
    c.lineWidth = o.width || 1.4;
    c.globalAlpha = o.alpha === undefined ? 0.45 : o.alpha;
    if (o.dash !== null) c.setLineDash(o.dash || [5, 4]);
    c.beginPath();
    c.moveTo(p.x(a[0]), p.y(a[1]));
    c.lineTo(p.x(b[0]), p.y(b[1]));
    c.stroke();
    c.restore();
    return this;
  };

  /** 평면 전체를 덮는 칠 — 두 독립 벡터의 Span 이 R² 임을 보일 때 */
  Board.prototype.fillPlane = function (o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    c.save();
    c.fillStyle = o.fill || css('--accent-soft');
    c.globalAlpha = o.alpha === undefined ? 0.35 : o.alpha;
    c.fillRect(p.margin.left, p.margin.top, p.pw, p.ph);
    c.restore();
    return this;
  };

  /** 점 + 라벨 */
  Board.prototype.point = function (q, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    c.save();
    c.fillStyle = o.color || css('--accent');
    c.beginPath();
    c.arc(p.x(q[0]), p.y(q[1]), o.r || 4, 0, Math.PI * 2);
    c.fill();
    if (o.ring) {
      c.strokeStyle = o.ring;
      c.lineWidth = o.ringWidth || 2;
      c.stroke();
    }
    if (o.label) {
      c.font = '700 12px ' + FONT;
      c.fillStyle = o.color || css('--accent');
      c.textAlign = o.align || 'left';
      c.textBaseline = 'bottom';
      c.fillText(o.label, p.x(q[0]) + (o.dx || 8), p.y(q[1]) + (o.dy || -6));
    }
    c.restore();
    return this;
  };

  /** 직각 표시 — 두 벡터가 수직임을 보일 때 */
  Board.prototype.rightAngle = function (at, u, v, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var s = o.size || 12;
    var a = M.unit(u), b = M.unit(v);
    var P0 = [p.x(at[0]), p.y(at[1])];
    // 화면 좌표에서의 방향 (y 는 아래로 증가하므로 부호 뒤집기)
    var A = [a[0], -a[1]], B = [b[0], -b[1]];
    c.save();
    c.strokeStyle = o.color || css('--text-dim');
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(P0[0] + A[0] * s, P0[1] + A[1] * s);
    c.lineTo(P0[0] + A[0] * s + B[0] * s, P0[1] + A[1] * s + B[1] * s);
    c.lineTo(P0[0] + B[0] * s, P0[1] + B[1] * s);
    c.stroke();
    c.restore();
    return this;
  };

  /** 원 (SVD 에서 단위원 → 타원) */
  Board.prototype.ellipse = function (A, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    var N = 180;
    c.save();
    c.beginPath();
    for (var i = 0; i <= N; i++) {
      var t = i / N * Math.PI * 2;
      var q = A ? M.mv(A, [Math.cos(t), Math.sin(t)]) : [Math.cos(t), Math.sin(t)];
      var X = p.x(q[0]), Y = p.y(q[1]);
      if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
    }
    c.closePath();
    if (o.fill) { c.fillStyle = o.fill; c.globalAlpha = o.alpha === undefined ? 0.25 : o.alpha; c.fill(); c.globalAlpha = 1; }
    c.strokeStyle = o.color || css('--accent');
    c.lineWidth = o.width || 1.8;
    if (o.dash) c.setLineDash(o.dash);
    c.stroke();
    c.restore();
    return this;
  };

  /* ---------------------------------------------------------
     3. 끌기 — 벡터 끝점을 잡아 움직인다
         handles: [{get:()=>[x,y], set:([x,y])=>{}}, ...]
     --------------------------------------------------------- */
  function drag(board, handles, onChange, o) {
    o = o || {};
    var snap = o.snap || 0;                       // 0 이면 자유, 0.5 면 0.5 단위로 붙음
    var hit = o.hit || 18;                        // 잡히는 반경(px)
    var active = -1;
    var canvas = board.canvas;

    function nearest(ev) {
      var q = V.pointerPos(canvas, ev);
      var best = -1, bestD = hit;
      handles.forEach(function (h, i) {
        var v = h.get();
        var d = Math.hypot(board.px(v[0]) - q.x, board.py(v[1]) - q.y);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    function place(ev) {
      var m = board.at(ev);
      if (snap) m = [Math.round(m[0] / snap) * snap, Math.round(m[1] / snap) * snap];
      if (o.clamp) m = o.clamp(m, active);
      handles[active].set(m);
      onChange();
    }

    canvas.addEventListener('pointerdown', function (ev) {
      active = nearest(ev);
      if (active < 0) return;
      canvas.setPointerCapture(ev.pointerId);
      canvas.style.cursor = 'grabbing';
      place(ev);
      ev.preventDefault();
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (active >= 0) { place(ev); ev.preventDefault(); return; }
      canvas.style.cursor = nearest(ev) >= 0 ? 'grab' : 'default';
    });
    function end(ev) {
      if (active < 0) return;
      active = -1;
      canvas.style.cursor = 'default';
      try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* 이미 놓였음 */ }
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    return { isDragging: function () { return active >= 0; } };
  }

  /** 끌 수 있는 점이라는 표시 — 흰 테두리 동그라미 */
  Board.prototype.handle = function (q, o) {
    o = o || {};
    var p = this.plot, c = this.ctx;
    c.save();
    c.beginPath();
    c.arc(p.x(q[0]), p.y(q[1]), o.r || 6, 0, Math.PI * 2);
    c.fillStyle = o.color || css('--accent');
    c.fill();
    c.strokeStyle = css('--surface');
    c.lineWidth = 2.2;
    c.stroke();
    c.restore();
    return this;
  };

  /* 숫자를 짧게 — 화면에 3.0000000004 가 뜨는 것을 막는다 */
  function num(v, d) {
    if (d === undefined) d = 2;
    var s = (Math.abs(v) < 5e-3 ? 0 : v).toFixed(d);
    return s.replace(/\.?0+$/, '') || '0';
  }

  global.LA = {
    Board: Board,
    drag: drag,
    M: M,
    num: num
  };
})(window);
