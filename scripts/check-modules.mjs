#!/usr/bin/env node
/**
 * 모듈 스모크 테스트
 *
 *  1. 모든 페이지를 실제 브라우저로 열어 JS 오류가 없는지 확인
 *  2. 캔버스에 실제로 뭔가 그려졌는지 확인 (빈 화면 방지)
 *  3. 버튼·슬라이더를 눌러봐도 오류가 안 나는지 확인
 *  4. 페이지 안의 로컬 링크·자원 경로가 실제로 존재하는지 확인
 *
 * 사용법:
 *   node scripts/check-modules.mjs             # 전체 검사
 *   node scripts/check-modules.mjs --measure   # 임베드 권장 높이도 함께 출력
 *   node scripts/check-modules.mjs --only 04   # 특정 모듈만
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8123;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const PAGES = [
  'index.html',
  'modules/01-center-spread.html',
  'modules/02-distribution-shape.html',
  'modules/03-normal-z.html',
  'modules/04-clt.html',
  'modules/05-confidence-interval.html',
  'modules/06-pvalue.html',
  'modules/07-regression.html',
  'modules/08-simpson.html',
  'python/p01-first-look.html',
  'python/p02-select-filter.html',
  'python/p03-cleaning.html',
  'python/p04-datetime.html',
  'python/p05-summary-stats.html',
  'python/p06-groupby.html',
  'python/p07-distribution.html',
  'python/p08-merge.html',
  'python/p09-first-plot.html',
  'python/p10-plot-polish.html',
  'python/p11-seaborn.html',
  'python/p12-regression.html',
  'python/p13-inference.html',
  'python/p14-timeseries.html',
  'python/p15-decompose.html',
  'python/p16-forecast.html',
  'linalg/L01-vectors.html',
  'linalg/L02-two-pictures.html',
  'linalg/L03-elimination.html',
  'linalg/L04-matrix-ops.html',
];

/** 캔버스가 없어도 정상인 페이지 (파이썬 실습 강의 등) */
const NO_CANVAS = new Set(['index.html', 'python/p01-first-look.html', 'python/p02-select-filter.html', 'python/p03-cleaning.html', 'python/p04-datetime.html', 'python/p05-summary-stats.html', 'python/p06-groupby.html', 'python/p07-distribution.html', 'python/p08-merge.html', 'python/p09-first-plot.html', 'python/p10-plot-polish.html', 'python/p11-seaborn.html', 'python/p12-regression.html', 'python/p13-inference.html', 'python/p14-timeseries.html', 'python/p15-decompose.html', 'python/p16-forecast.html']);

const args = process.argv.slice(2);
const MEASURE = args.includes('--measure');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

/* ------------------------------------------------------------------ */
/* 1. 정적 서버                                                        */
/* ------------------------------------------------------------------ */
function startServer() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

/* ------------------------------------------------------------------ */
/* 2. 링크 검사 (브라우저 없이 파일 시스템으로)                          */
/* ------------------------------------------------------------------ */
function checkLinks() {
  const problems = [];
  for (const page of PAGES) {
    const raw = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const dir = path.dirname(path.join(ROOT, page));

    // 마크업만 검사한다. 스크립트 안의 문자열 조각은 링크가 아니다.
    const markup = raw.replace(/<script[\s\S]*?<\/script>/gi, '');
    for (const m of markup.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const ref = m[1];
      if (/^(https?:|data:|mailto:|#|\/\/)/.test(ref)) continue;
      const target = ref.split('#')[0].split('?')[0];
      if (!target) continue;
      if (!fs.existsSync(path.resolve(dir, target))) problems.push(`${page} → ${ref}`);
    }

    // 허브가 스크립트 안에서 참조하는 모듈 경로도 확인한다.
    if (page === 'index.html') {
      for (const m of raw.matchAll(/file:\s*'(modules\/[^']+)'/g)) {
        if (!fs.existsSync(path.resolve(dir, m[1]))) problems.push(`${page} → ${m[1]} (MODULES)`);
      }
    }
  }
  return problems;
}

/* ------------------------------------------------------------------ */
/* 3. Colab 링크 검사                                                   */
/*                                                                     */
/* Colab 은 blob/<ref>/... 에서 첫 세그먼트만 ref 로 읽는다. 그래서 ref 가  */
/* 슬래시 없는 단일 이름이어야 하고, 그 ref 에 노트북이 실제로 올라가 있어야  */
/* 한다. 링크는 강의마다 손으로 박혀 있어 조용히 어긋나기 쉬우므로 검사한다.  */
/* ------------------------------------------------------------------ */
const COLAB_REPO = 'mioon1402/timeseriesdata';
const COLAB_REF = 'main';

function checkColabTargets() {
  return PAGES.filter((p) => p.startsWith('python/') || p.startsWith('linalg/'));
}

function checkColab() {
  const problems = [];
  const lessons = PAGES.filter((p) => p.startsWith('python/') || p.startsWith('linalg/'));

  for (const page of lessons) {
    const raw = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const slug = path.basename(page, '.html');

    // 두 가지 형태를 모두 받는다: URL 인라인, 그리고 REPO/BRANCH/NOTEBOOK 상수.
    let repo, ref, notebook;
    const inline = raw.match(
      /colab\.research\.google\.com\/github\/([^/]+\/[^/]+)\/blob\/([^/'"]+)\/(\S+?\.ipynb)/
    );
    const consts = raw.match(
      /var REPO = '([^']+)'[\s\S]*?var BRANCH = '([^']+)'[\s\S]*?var NOTEBOOK = '([^']+)'/
    );
    if (inline) [, repo, ref, notebook] = inline;
    else if (consts) [, repo, ref, notebook] = consts;
    else {
      problems.push(`${page} → Colab 링크를 찾을 수 없음`);
      continue;
    }

    if (repo !== COLAB_REPO) problems.push(`${page} → 저장소 ${repo} (기대 ${COLAB_REPO})`);
    if (ref !== COLAB_REF) problems.push(`${page} → ref ${ref} (기대 ${COLAB_REF})`);
    if (ref.includes('/')) problems.push(`${page} → ref 에 슬래시가 있어 Colab 이 읽지 못함: ${ref}`);
    if (notebook !== `notebooks/${slug}.ipynb`) {
      problems.push(`${page} → 노트북 경로 ${notebook} (기대 notebooks/${slug}.ipynb)`);
    }
    if (!fs.existsSync(path.join(ROOT, notebook))) {
      problems.push(`${page} → 노트북 파일 없음: ${notebook}`);
    }
  }
  return problems;
}

/* ------------------------------------------------------------------ */
/* 4. 크로미움 찾기                                                     */
/* ------------------------------------------------------------------ */
function findChromium() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (fs.existsSync(base)) {
    for (const entry of fs.readdirSync(base)) {
      if (!entry.startsWith('chromium-')) continue;
      const p = path.join(base, entry, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 5. 메인                                                             */
/* ------------------------------------------------------------------ */
const run = async () => {
  console.log('· 링크 검사');
  const linkProblems = checkLinks();
  if (linkProblems.length) {
    console.log('  FAIL 끊어진 링크:');
    linkProblems.forEach((p) => console.log('       ' + p));
  } else {
    console.log('  ok   끊어진 링크 없음');
  }

  console.log('· Colab 링크 검사');
  const colabProblems = checkColab();
  if (colabProblems.length) {
    console.log('  FAIL Colab 링크 문제:');
    colabProblems.forEach((p) => console.log('       ' + p));
  } else {
    console.log(`  ok   강의 ${checkColabTargets().length}개 모두 정상`);
  }

  const staticProblems = linkProblems.length + colabProblems.length;

  const exe = findChromium();
  if (!exe) {
    console.log('\n! 크로미움을 찾지 못해 렌더링 검사를 건너뜁니다.');
    console.log('  CHROME_PATH 환경변수를 지정하거나 npx playwright install chromium 을 실행하세요.');
    process.exit(staticProblems ? 1 : 0);
  }

  const { chromium } = await import('playwright-core');
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });

  let failed = linkProblems.length;
  const targets = ONLY ? PAGES.filter((p) => p.includes(ONLY)) : PAGES;

  console.log('\n· 렌더링 / 인터랙션 검사');
  for (const page of targets) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
    const tab = await ctx.newPage();
    const errors = [];
    tab.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    tab.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

    await tab.goto(`http://localhost:${PORT}/${page}`, { waitUntil: 'networkidle' });

    // 버튼과 슬라이더를 실제로 조작해본다
    for (const b of (await tab.$$('.btns button.btn')).slice(0, 5)) {
      try { await b.click({ timeout: 1000 }); await tab.waitForTimeout(100); } catch { /* 무시 */ }
    }
    for (const r of await tab.$$('input[type=range]')) {
      try {
        await r.evaluate((el) => {
          el.value = String((parseFloat(el.min) + parseFloat(el.max)) / 2);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await tab.waitForTimeout(60);
      } catch { /* 무시 */ }
    }
    for (const c of await tab.$$('.seg input[type=radio]')) {
      try { await c.check({ timeout: 800 }); await tab.waitForTimeout(60); } catch { /* 무시 */ }
    }
    try { await tab.click('#auto', { timeout: 400 }); } catch { /* 자동 재생 정지 */ }
    await tab.waitForTimeout(200);

    // 캔버스에 실제로 그려졌는지 (알파값이 0이 아닌 픽셀 수)
    const drawn = await tab.evaluate(() =>
      [...document.querySelectorAll('canvas')].map((c) => {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) n++;
        return n;
      })
    );

    const blank = NO_CANVAS.has(page) ? 0 : drawn.filter((v) => v === 0).length;
    const ok = errors.length === 0 && blank === 0;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${page.padEnd(34)} canvas=[${drawn.join(', ')}]`);
    errors.slice(0, 4).forEach((e) => console.log('       ' + e.slice(0, 180)));
    await ctx.close();
  }

  /* 임베드 권장 높이 측정 */
  if (MEASURE) {
    const widths = [900, 760, 600, 380];
    for (const view of ['viz', 'full']) {
      console.log(`\n· 임베드 높이 (view=${view})`);
      console.log('  ' + 'module'.padEnd(26) + widths.map((w) => String(w).padStart(7)).join('') + '     권장');
      for (const page of PAGES.slice(1)) {
        const hs = [];
        for (const w of widths) {
          const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
          const tab = await ctx.newPage();
          const q = view === 'viz' ? '?embed=1&view=viz' : '?embed=1';
          await tab.goto(`http://localhost:${PORT}/${page}${q}`, { waitUntil: 'networkidle' });
          await tab.waitForTimeout(220);
          hs.push(await tab.evaluate(() => Math.ceil(document.documentElement.getBoundingClientRect().height)));
          await ctx.close();
        }
        const rec = Math.ceil((Math.max(...hs) + 15) / 10) * 10;
        console.log('  ' + path.basename(page, '.html').padEnd(26) +
          hs.map((h) => String(h).padStart(7)).join('') + String(rec).padStart(8));
      }
    }
  }

  await browser.close();
  server.close();

  const total = failed + staticProblems;
  console.log(total ? `\n실패 ${total}건` : '\n전부 통과');
  process.exit(total ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
