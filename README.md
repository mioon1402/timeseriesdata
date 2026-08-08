# 눈으로 보는 통계

공식보다 그림이 먼저인 **인터랙티브 통계 교육 모듈 8종**.
빌드 도구 없이 브라우저에서 바로 열리고, **티스토리 등 블로그에 iframe 한 줄로 임베드**됩니다.

각 모듈은 같은 구조로 되어 있습니다.

> **직접 만져보기 → 직관 → 수식(기호 풀이 포함) → 실무 적용 → 흔한 실수 → 요약**

대학 교양 수준부터 데이터 분석 실무 입문까지를 겨냥했습니다.

---

## 모듈

| # | 제목 | 무엇을 만지나 | 다루는 개념 |
| --- | --- | --- | --- |
| 01 | [평균은 시소, 분산은 넓이](modules/01-center-spread.html) | 점을 끌면 받침점이 따라옴. 편차 제곱이 **실제 정사각형**으로 그려짐 | 평균 · 중앙값 · 분산 · 표준편차 · n vs n−1 |
| 02 | [히스토그램은 거짓말을 할 수 있다](modules/02-distribution-shape.html) | 구간 폭 슬라이더 하나로 봉우리가 생겼다 사라짐 | 히스토그램 · 왜도 · 사분위수 · 상자그림 · 이상치 |
| 03 | [면적이 곧 확률이다](modules/03-normal-z.html) | 곡선을 늘리고 줄여도 68-95-99.7은 그대로 | 정규분포 · z-점수 · 표준화 · 꼬리확률 |
| 04 | [이상한 모집단, 멀쩡한 평균](modules/04-clt.html) | 치우친 모집단에서 표본을 뽑으면 평균만 종 모양으로 | **중심극한정리** · 표준오차 · 표본 크기 설계 |
| 05 | [95%는 무엇의 95%인가](modules/05-confidence-interval.html) | 신뢰구간 200개를 그리면 약 10개가 빗나감 | 신뢰구간 · 오차범위 · t분포 |
| 06 | [p-값을 손으로 만들어보기](modules/06-pvalue.html) | 라벨을 섞어 **귀무분포를 직접 생성** | 가설검정 · p-값 · 1종/2종 오류 · 검정력 · p-해킹 |
| 07 | [최소제곱은 넓이의 합이다](modules/07-regression.html) | 직접 선을 그어 잔차 정사각형 넓이를 줄여봄 | 상관계수 · 회귀 · r² · 잔차 진단 |
| 08 | [방향이 뒤집히는 순간](modules/08-simpson.html) | 슬라이더 하나로 기울기 부호가 반전 | 심슨의 역설 · 교란변수 · 인과추론 |

모듈은 순서대로 이어집니다. 04(중심극한정리)가 05·06의 토대이고,
01의 "편차 제곱 = 넓이"가 07의 최소제곱으로 다시 나옵니다.

---

## 2부 · 파이썬으로 직접 해보기

**설치도 가입도 없이 브라우저 안에서 진짜 파이썬이 돕니다.**
[Pyodide](https://pyodide.org)(CPython → WebAssembly) 위에서 pandas·matplotlib·seaborn이
그대로 실행됩니다. 독자는 코드를 고쳐서 바로 다시 돌려볼 수 있습니다.

가상 카페 **"밀롱 커피"** 한 곳의 2년치 데이터를 처음부터 끝까지 함께 분석합니다.

| 부 | 회차 | 내용 |
| --- | --- | --- |
| **데이터 다루기** | P01 [처음 만나는 데이터](python/p01-first-look.html) | `read_csv` · `shape` · `info` · `describe` |
| | P02 [필요한 것만 꺼내기](python/p02-select-filter.html) | 불리언 마스크 · `&`/`|`/`~` · `loc`/`iloc` |
| | P03 [지저분한 데이터 청소하기](python/p03-cleaning.html) | 결측·중복·자료형 · **평균 대체가 분산을 16% 줄이는 실험** |
| | P04 [날짜를 날짜답게](python/p04-datetime.html) | `to_datetime` · `dt` 접근자 · 기간 슬라이싱 |
| **요약과 통계** | P05 [숫자로 요약하기](python/p05-summary-stats.html) | 기술통계 · **ddof 함정** · 분위수 · 변동계수 · 왜도 |
| | P06 [그룹별로 나눠 보기](python/p06-groupby.html) | `groupby` · `agg` · `pivot_table` · 통제의 기본 |
| | P07 [분포 확인하기](python/p07-distribution.html) | `cut`/`qcut` · IQR 울타리 · **3σ의 가면 효과** |
| | P08 [두 데이터 합치기](python/p08-merge.html) | `merge` 4종 · **중복 키로 합계가 부풀려지는 사고** · `validate` |
| **시각화** | P09 [첫 그래프 그리기](python/p09-first-plot.html) | 선·막대·히스토그램·산점도 · 한글 폰트 · **y축 0부터** |
| | P10 [보기 좋은 그래프로](python/p10-plot-polish.html) | 날짜축 · 색은 정보일 때만 · 주석 · 저장 |
| | P11 [seaborn으로 빠르게](python/p11-seaborn.html) | `hue` 한 줄 그룹 비교 · 히트맵 · KDE의 함정 |
| **통계적 추론** | P12 [관계를 숫자로](python/p12-regression.html) | 피어슨/스피어만 · OLS 결과표 · 잔차 진단 · 다중회귀 |
| | P13 [신뢰구간과 가설검정](python/p13-inference.html) | Welch t검정 · 차이의 CI · Cohen's d · 순열검정 · 다중검정 |
| **시계열과 예측** | P14 [시계열 다루기](python/p14-timeseries.html) | `resample` · `rolling` · `diff(7)` · **데이터 누수 방지** |
| | P15 [추세와 계절성 분해](python/p15-decompose.html) | `seasonal_decompose` · 가법/승법 · 계절조정 |
| | P16 [예측해보기](python/p16-forecast.html) | 기준선 · MAE/RMSE/MAPE · SARIMA · **롤링 검증** |

**16강 전부 완성**되어 있습니다. 각 강의는 **웹에서 바로 실습**하거나 **Colab에서 열어** 자유롭게 파고들 수 있습니다.
1부의 통계 이론과 짝을 이룹니다 (예: P05 ↔ 모듈 01, P12 ↔ 모듈 07, P13 ↔ 모듈 05·06).

### 예시 데이터

`scripts/gen_data.py` 가 결정론적으로 생성합니다. 실습에 필요한 성질을 일부러 심어두었습니다.

| 파일 | 내용 | 심어둔 학습 포인트 |
| --- | --- | --- |
| `data/cafe_sales.csv` | 일별 매출 731행 | 추세(132→190명) · 요일 효과(월 146 vs 토 227) · 여름 피크 · 결측 13건 · 휴점 2일 · 방송 대박 1일 |
| `data/cafe_sales_messy.csv` | 정리 실습용 184행 | 날짜 형식 3종 혼재 · `1,234원` 표기 · 공백 · 중복행 · `N/A`/`-` 혼용 |
| `data/weather.csv` | 날씨 708행 | 일부 날짜 누락 → `merge` 실습 |
| `data/menu_orders.csv` | 메뉴별 주문 6,561행 | `groupby` · `pivot_table` 실습 |

기온-매출 상관 r ≈ +0.51, 방문객-매출 r ≈ +0.99 로 관계가 직관적으로 보이도록 설계했습니다.

### 브라우저 안 파이썬은 어떻게 동작하나

| 파일 | 역할 |
| --- | --- |
| `assets/pylab.js` | Pyodide 부팅, 패키지·데이터·폰트 준비, 코드 실행, 오류 해설 |
| `assets/pycell.js` | `<div class="pycell">` 을 편집 가능한 실행 셀로 변환 |
| `assets/pycell.css` | 셀·출력·표·오류 스타일 |
| `assets/fonts/` | matplotlib 한글 폰트 (나눔고딕 서브셋 1.9MB, [출처](assets/fonts/NOTICE.md)) |

설계상 중요한 점:

- **게으른 로딩** — [실행]을 누르기 전엔 아무것도 내려받지 않습니다. 글만 읽는 독자에게 수십 MB를 강요하지 않습니다.
- **런타임 공유** — 페이지 전체가 하나의 파이썬을 씁니다. 앞 셀의 변수가 뒤 셀에서 살아 있습니다.
- **우아한 실패** — CDN이 막힌 환경에서는 오류 대신 안내와 Colab 링크를 보여줍니다.
- **초보자용 오류 해설** — `KeyError` 같은 예외를 한국어 힌트로 번역합니다.

```html
<!-- 강의 안에서 이렇게 쓰면 실행 가능한 셀이 됩니다 -->
<div class="pycell" data-packages="pandas,matplotlib" data-data="cafe_sales.csv">
import pandas as pd
df = pd.read_csv("cafe_sales.csv")
df.head()
</div>
```

### Colab 노트북

`scripts/make_notebooks.py` 가 **강의 HTML에서 자동 생성**합니다.
웹 강의를 단일 원본으로 두어 두 쪽이 어긋나지 않게 했습니다.

```bash
python3 scripts/gen_data.py        # 예시 데이터 생성
python3 scripts/make_notebooks.py  # notebooks/*.ipynb 생성
```

---

## 바로 보기

로컬에서 열려면 정적 서버가 필요합니다 (`file://`로 열면 공용 CSS/JS가 안 붙습니다).

```bash
npm run serve       # → http://localhost:8080
# 또는
python3 -m http.server 8080
```

첫 화면(`index.html`)에 **임베드 코드 생성기**가 있습니다.

### URL 옵션

| 쿼리 | 뜻 |
| --- | --- |
| `?view=viz` | 시각화 패널만 표시 (설명 글 숨김) |
| `?embed=1` | 임베드 모드 — 네비게이션 숨김, 여백 축소 |
| `?theme=light` / `?theme=dark` | 색 테마 고정 (생략하면 시스템 설정을 따름) |

예: `modules/04-clt.html?embed=1&view=viz&theme=light`

---

## 블로그에 붙이기

1. GitHub Pages로 배포합니다 (**Settings → Pages → Deploy from a branch → `/ (root)`**).
2. 배포된 첫 화면에서 모듈의 **[임베드 코드]** 를 누르고 옵션을 고른 뒤 복사합니다.
3. 티스토리 글쓰기의 **HTML 모드**에 붙여넣습니다.

> ⚠️ 붙여넣은 뒤 **기본모드로 되돌리지 마세요.** 에디터가 태그를 재정리하면서 깨질 수 있습니다.

자세한 내용과 문제 해결은 **[docs/tistory-embed.md](docs/tistory-embed.md)** 를 보세요.

iframe 방식이라 **저장소 코드를 고치면 이미 발행한 글이 전부 자동으로 갱신**됩니다.

---

## 구조

```
index.html                  허브 + 임베드 코드 생성기
assets/
  viz.css                   공용 스타일 (라이트/다크 토큰, 수식·실무·함정 블록)
  viz.js                    공용 라이브러리 — 외부 의존성 없음
modules/
  01-center-spread.html     … 08-simpson.html
docs/
  tistory-embed.md          배포·임베드 가이드
scripts/
  check-modules.mjs         스모크 테스트
```

### `assets/viz.js`

모든 모듈이 공유하는 라이브러리입니다. CDN도 프레임워크도 쓰지 않습니다.

- **`V.Plot`** — 축·격자·곡선·막대·면적을 그리는 캔버스 플롯 (고해상도 대응)
- **`V.Rng`** — 시드 기반 재현 가능 난수 (mulberry32, 정규·지수·셔플)
- **`V.S`** — 평균/분산/분위수/상관/회귀/히스토그램
- **`V.normalPdf` · `normalCdf` · `normalQuantile`** — 정규분포 계산
- **`V.POPS`** — 중심극한정리용 모집단 카탈로그
- **`V.range` · `V.click` · `V.radios` · `V.check`** — 컨트롤 바인딩
- **`V.onRedraw`** — 리사이즈·테마 변경 시 자동 재렌더 등록

색은 전부 CSS 변수에서 읽으므로 다크모드가 캔버스까지 자동 적용됩니다.

### 모듈 추가하기

1. `modules/09-....html` 을 기존 모듈에서 복사해 시작합니다.
2. `index.html` 의 `MODULES` 배열에 항목을 추가합니다.
3. `npm run measure` 로 임베드 권장 높이를 구해 `vizHeight`/`fullHeight`에 넣습니다.
4. `scripts/check-modules.mjs` 의 `PAGES` 에 경로를 추가합니다.

---

## 테스트

```bash
npm install     # playwright-core (크로미움은 환경에 이미 있으면 재사용)
npm test        # 링크 검사 + 전 모듈 렌더링/인터랙션 검사
npm run measure # 위 검사 + 임베드 권장 높이 측정
```

검사 내용:

- 페이지 안의 **로컬 링크·자원 경로**가 실제로 존재하는지
- 모든 페이지에 **JS 오류가 없는지** (`pageerror` / console error)
- **캔버스에 실제로 뭔가 그려졌는지** (빈 화면 방지)
- 버튼·슬라이더·라디오를 **눌러봐도 오류가 안 나는지**

크로미움을 못 찾으면 렌더링 검사를 건너뛰고 링크 검사만 수행합니다.
경로를 직접 지정하려면 `CHROME_PATH` 환경변수를 쓰세요.

### Claude Code on the web

`.claude/hooks/session-start.sh` 가 세션 시작 시 `npm install` 을 돌리고
미리 설치된 크로미움 경로를 잡아줍니다. 웹 세션에서 바로 `npm test` 를 실행할 수 있습니다.
로컬 환경에서는 아무 동작도 하지 않습니다.

---

## 만든 기준

- **외부 의존성 0** — CDN, 프레임워크, 빌드 단계 없음. HTML 파일을 열면 그냥 돕니다.
- **라이트/다크 모두 지원** — 캔버스 색까지 CSS 변수를 따릅니다.
- **모바일 대응** — 포인터 이벤트라 터치로도 점을 끌 수 있습니다.
- **수식을 숨기지 않음** — 대신 모든 기호에 풀이를 붙였습니다.
- **실무로 연결** — 각 모듈에 "실무에서 어떻게 쓰는가"와 "흔한 실수"가 있습니다.
