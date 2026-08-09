# 눈으로 보는 통계

공식보다 그림이 먼저인 **인터랙티브 교육 자료 56강**.
빌드 도구 없이 브라우저에서 바로 열리고, **티스토리 등 블로그에 iframe 한 줄로 임베드**됩니다.

| 부 | 내용 | 분량 |
| --- | --- | --- |
| **1부** | [눈으로 보는 통계](#모듈) — 점을 끌고 슬라이더를 돌리며 배우는 통계 | 8강 |
| **2부** | [파이썬으로 직접 해보기](#2부--파이썬으로-직접-해보기) — 브라우저 안에서 진짜 pandas가 도는 실습 | 16강 |
| **3부** | [눈으로 보는 선형대수](#3부--눈으로-보는-선형대수) — 벡터를 끌고 변환을 돌려보는 선형대수 | 20강 |
| **4부** | [미적분의 직관](#4부--미적분의-직관) — 쪼개고 근사하고 합치고 극한 보내는 미적분 | 12강 |

각 강의는 같은 구조로 되어 있습니다.

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

## 3부 · 눈으로 보는 선형대수

**벡터를 끌고 변환을 돌려보며 배우는 선형대수 20강.**
각 강의는 `0절 기초 다지기 → 인터랙티브 시각화 → 수식(기호 풀이) → numpy 실습 →
실무 적용 → 흔한 함정 → 연습문제와 모범 답안 → 요약` 순서로 되어 있습니다.

수학 배경이 없어도 따라올 수 있도록 **모든 강의가 0절에서 필요한 개념부터 다시 시작**합니다.
캔버스는 전부 **등축(equal aspect)** 으로 그립니다 — 선형대수에서는 각도와 길이 자체가 내용이기 때문입니다.

| 부 | 회차 | 무엇을 만지나 | 다루는 개념 |
| --- | --- | --- | --- |
| **벡터와 공간** | L01 [벡터라는 화살표](linalg/L01-vectors.html) | 벡터를 끌면 합·차·스칼라배가 따라 움직임 | 벡터 · 덧셈의 평행사변형 · 스칼라배 |
| | L02 [행렬 × 벡터의 두 그림](linalg/L02-two-pictures.html) | 행 관점(직선의 교점) ↔ 열 관점(선형결합) 전환 | 행 그림 · **열 그림** · Ax = b |
| | L03 [소거법](linalg/L03-elimination.html) | 소거 단계마다 직선이 어떻게 움직이는지 | 가우스 소거 · 피벗 · LU · **부분 피벗팅** |
| | L04 [행렬 연산](linalg/L04-matrix-ops.html) | 두 변환을 이어 붙이면 격자가 두 번 휨 | 곱셈 4가지 관점 · 전치 · 역행렬 |
| | L05 [부분공간과 Span](linalg/L05-subspace.html) | 벡터 두 개가 평면을 채우는지 선에 갇히는지 | 부분공간 · Span · 일차독립 · 기저 |
| | L06 [영공간](linalg/L06-nullspace.html) | 뭉개져 0이 되는 방향을 직접 찾기 | 영공간 · 특수해 + 영공간 · 자유변수 |
| | L07 [랭크와 네 부분공간](linalg/L07-rank.html) | 랭크를 떨어뜨리면 공간이 무너짐 | 랭크 · 열공간/영공간/행공간/좌영공간 |
| | L08 [직교성](linalg/L08-orthogonality.html) | 내적이 0이 되는 순간을 눈으로 | 내적 · 직교 · 코시-슈바르츠 · 직교여공간 |
| | L09 [정사영](linalg/L09-projection.html) | 그림자를 끌어보며 최단거리 확인 | 정사영 행렬 · 멱등 · 대칭 |
| **분해** | L10 [최소제곱](linalg/L10-least-squares.html) | 잔차를 직접 줄여봄 | 정규방정식 · 열공간으로의 투영 |
| | L11 [QR 분해](linalg/L11-qr.html) | 그람-슈미트가 축을 세우는 과정 | 그람-슈미트 · QR · 하우스홀더 · 수치 안정성 |
| | L12 [행렬식](linalg/L12-determinant.html) | 평행사변형 넓이가 곧 det | 행렬식 = 부피 배율 · 부호 = 방향 |
| | L13 [고윳값과 고유벡터](linalg/L13-eigen.html) | 방향이 안 변하는 축을 찾아보기 | 특성방정식 · 거듭제곱법 |
| | L14 [대각화](linalg/L14-diagonalization.html) | 좌표계를 갈아타면 격자가 안 휨 | A = BΛB⁻¹ · 거듭제곱 · **대각화 불가** |
| | L15 [대칭행렬](linalg/L15-symmetric.html) | 고유벡터가 항상 직교하는 모습 | 스펙트럼 정리 · 양의 정부호 · 이차형식 |
| | L16 [SVD](linalg/L16-svd.html) | 단위원이 타원으로 변하는 그림 | A = UΣVᵀ · 특이값 · 회전-늘림-회전 |
| | L17 [Low-rank 근사](linalg/L17-lowrank.html) | **브라우저에서 실제 SVD로 이미지 압축** | Eckart-Young · 압축 · 잡음 제거 |
| **응용** | L18 [의사역행렬과 추천 시스템](linalg/L18-pseudoinverse.html) | 해 직선 위에서 가장 짧은 해 찾기 · 별점표 빈칸 채우기 | A⁺ · 최소노름해 · 무어-펜로즈 · 협업 필터링 · 극분해 |
| | L19 [선형변환의 기하학](linalg/L19-transform.html) | 회전·반사·투영·전단 버튼으로 격자 변형 | 열 = 기저의 행선지 · det 부호 · **기저 변환** · 동차좌표 |
| | L20 [복소 벡터공간과 응용](linalg/L20-applications.html) | 복소 고윳값이 만드는 나선 · 페이지랭크 수렴 과정 | 에르미트 · 유니터리 · DFT · PCA · **PageRank** · 희소행렬 |

**20강 전부 완성**되어 있습니다. `assets/linalg.js` 가 시각화를 담당하고,
각 강의의 numpy 실습은 브라우저에서 바로 돌리거나 Colab에서 열 수 있습니다.

### `assets/linalg.js`

`viz.js` 위에 얹은 **선형대수 전용 그리기 계층**입니다.

- **`LA.Board`** — 등축 좌표판. `fit()` 으로 범위 자동 조절, `begin()` 이 두 축의 픽셀/단위 배율을 일치시킵니다
- **`grid` · `transformedGrid`** — 원래 격자와 A로 휜 격자
- **`arrow` · `parallelogram` · `span` · `fillPlane` · `ellipse` · `rightAngle` · `lineEq`** — 선형대수 도형들
- **`LA.drag`** — 벡터 끝점을 마우스·터치로 끌기
- **`LA.M`** — 2×2 행렬 계산 (`det` `inv` `eig` `svd` `solve` …) 과
  **작은 행렬용 야코비 SVD**(`jacobi` · `svdFull` · `lowRank`) — L17·L18이 브라우저에서 실제 SVD를 돌립니다

수식은 CSS만으로 괄호를 그립니다 (`.mat` 클래스). 내용 높이에 따라 괄호가 같이 늘어납니다.

---

## 4부 · 미적분의 직관

**공식이 아니라 그림으로 배우는 미적분 12강.**
필요한 사전지식은 **사칙연산과 아주 간단한 문자식**뿐입니다.
`쪼개기 → 근사하기 → 합치기 → 극한 보내기` 네 박자가 12강 내내 반복됩니다.

원서의 그림 23개를 **정적 이미지가 아니라 직접 만지는 캔버스**로 옮겼습니다.
슬라이더를 밀면 오차가 0으로 사라지는 과정을 눈으로 보고, 숫자로도 확인할 수 있습니다.

| 부 | 회차 | 무엇을 만지나 | 다루는 개념 |
| --- | --- | --- | --- |
| **예고편** | C01 [원의 넓이](calc/C01-circle-area.html) | 고리 개수를 늘려 πR² 이 나타나는 과정 · 부채꼴 재배열 | 네 박자 · ∫2πr dr · **넓이를 미분하면 둘레** |
| **극한과 미분** | C02 [극한](calc/C02-limit.html) | 1 근처를 무한히 확대해도 닿지 않는 수열 · 곡선이 직선이 되는 확대 | lim · 국소 선형성 · **\|x\| 반례** · 구멍/점프/진동 |
| | C03 [미분의 역설](calc/C03-derivative.html) | 두 번째 점을 미끄러뜨려 할선 → 접선 · 기울기를 모아 도함수 그리기 | 순간 속도 · dy/dx · 도함수 · 위치·속도·가속도 |
| | C04 [기하 미분공식](calc/C04-power-rule.html) | 정사각형·정육면체를 키우며 붙는 조각 해부 | (xⁿ)′ = nxⁿ⁻¹ · **경계의 크기** · 1/x · √x |
| | C05 [곱·연쇄법칙](calc/C05-product-chain.html) | 팽창하는 직사각형 · 같은 배율의 세 수직선으로 본 기어비 | (gh)′ · 연쇄법칙 · 구조 분해 · 몫의 미분 |
| | C06 [오일러 상수 e](calc/C06-euler-e.html) | 접선 기울기가 1이 되는 밑 찾기 · 복리 계단이 eˣ 로 | (eˣ)′=eˣ · ln · (1+1/n)ⁿ · dy/dx = ky |
| | C07 [음함수 미분](calc/C07-implicit.html) | 등고선 위를 걸으며 접선 ⊥ 기울기벡터 확인 · 미끄러지는 사다리 | Fx·dx + Fy·dy = 0 · 관련 변화율 · (ln x)′ |
| | C08 [로피탈 · ε-δ](calc/C08-lhopital.html) | 두 함수가 0으로 가는 속도 경주 · **ε 띠와 δ 띠의 공방** | 부정형 · 로피탈의 조건 · ε-δ 정의 |
| **적분** | C09 [적분과 기본정리](calc/C09-integral.html) | 직사각형 개수 늘리기 · 오른쪽 끝을 밀면 자라는 얇은 띠 | 리만 합 · A′(x)=f(x) · F(b)−F(a) |
| | C10 [넓이와 기울기](calc/C10-average.html) | 같은 넓이의 직사각형 · 할선과 평행한 접선 찾기 | 연속 평균 · **평균값 정리** · 기본정리 재증명 |
| **도구와 마무리** | C11 [테일러 급수](calc/C11-taylor.html) | 차수를 올리며 넓어지는 유효 범위 · 수렴 반경 밖의 발산 | n! 의 정체 · 수렴 반경 · **선형화** |
| | C12 [dy/dx의 비밀](calc/C12-dydx.html) | 접선 위에서 잰 dx·dy · **u-v 평면의 두 영토** | 무한소 · 미분형식 · **부분적분** · 맺으며 |

**12강 전부 완성**되어 있습니다.
1강에 원서의 **기호 사전**과 **전체 지도**가, 12강에 **부록(부분적분)** 과 **맺으며**가 들어 있습니다.

### `assets/calc.js`

`viz.js` 위에 얹은 **미적분 전용 그리기 계층**입니다.

- **`CA.Graph`** — 함수 그래프판. `curve` · `area` · `riemann` · `tangent` · `secant` ·
  `slopeTriangle` · `poly` · `circle` · `legend`
- **`CA.Frame`** — 캔버스 하나를 여러 그래프가 위아래로 나눠 쓸 때
  (f 와 f′ 를 함께 보는 그림에 씁니다)
- **`equal: true` / `equal: 'x'`** — 등축. 접선의 기울기를 눈으로 읽어야 하는 그림에 씁니다.
  `'x'` 는 **가로 폭을 그대로 지켜** 화면의 '확대 배율' 숫자와 그림이 어긋나지 않게 합니다
- **`CA.F`** — 수치 미분(`deriv` · `deriv2`) · 적분(`integral` 심프슨) · `riemannSum`
- **`CA.dragX`** — 캔버스를 가로로 끌어 x 값 고르기

등축 그림은 `.board` 로 폭을 제한합니다 — 안 그러면 가로로만 늘어나 정사각형이 깨집니다.

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

1. GitHub Pages로 배포합니다 (**Settings → Pages → Deploy from a branch → `main` → `/ (root)`**).
2. 배포된 첫 화면에서 모듈의 **[임베드 코드]** 를 누르고 옵션을 고른 뒤 복사합니다.
3. 티스토리 글쓰기의 **HTML 모드**에 붙여넣습니다.

> **브랜치는 반드시 `main` 이어야 합니다.** 강의의 Colab 버튼과 노트북의 데이터
> 내려받기 주소가 `main` 에 고정돼 있기 때문입니다. Colab은 GitHub URL의
> `blob/<ref>/…` 에서 **첫 세그먼트만** ref로 읽으므로, `feature/foo` 처럼
> 슬래시가 든 브랜치명은 `feature` 를 ref로 착각해 "Notebook not found" 가 납니다.
> 작업은 기능 브랜치에서 하고, 발행은 `main` 으로 머지해서 하세요.
> `npm test` 가 이 링크들을 검사합니다.

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
  linalg.js                 선형대수 전용 그리기 계층 (등축 좌표판, 2×2 행렬 계산)
  calc.js                   미적분 전용 그리기 계층 (함수 그래프판, 리만합, 수치 미적분)
  pylab.js / pycell.js      브라우저 안 파이썬 (Pyodide)
  fonts/                    matplotlib 한글 폰트 서브셋
modules/
  01-center-spread.html     … 08-simpson.html          (1부 · 통계 8강)
python/
  p01-first-look.html       … p16-forecast.html        (2부 · 파이썬 16강)
linalg/
  L01-vectors.html          … L20-applications.html    (3부 · 선형대수 20강)
calc/
  C01-circle-area.html      … C12-dydx.html            (4부 · 미적분 12강)
notebooks/                  강의 HTML에서 자동 생성된 Colab 노트북
data/                       gen_data.py 가 만드는 예시 데이터
docs/
  tistory-embed.md          배포·임베드 가이드
scripts/
  check-modules.mjs         렌더링·링크·Colab 링크 스모크 테스트
  check_cells.py            실습 셀 파이썬 문법 검사
  register_lessons.py       강의 목록을 테스트 스크립트에 자동 등록
  make_notebooks.py         강의 HTML → Colab 노트북
  bump_assets.py            공용 자원 캐시 무효화 (?v=해시)
  gen_data.py               예시 데이터 생성
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

### 강의 추가하기 (2부 · 3부 · 4부)

`python/pNN-*.html` · `linalg/LNN-*.html` · `calc/CNN-*.html` 을 만든 뒤 아래를 순서대로 돌립니다.
`PAGES` 목록과 Colab 링크는 스크립트가 알아서 채웁니다.

```bash
python3 scripts/register_lessons.py   # check-modules.mjs 의 PAGES 갱신
python3 scripts/make_notebooks.py     # notebooks/*.ipynb 재생성
python3 scripts/bump_assets.py        # 공용 자원 ?v= 해시 갱신
npm test
```

`index.html` 의 `PY_LESSONS` / `LA_LESSONS` / `CALC_LESSONS` 배열에도 항목을 추가하세요
(`done` 은 `register_lessons.py` 가 자동으로 `true` 로 바꿉니다).

---

## 테스트

```bash
npm install     # playwright-core (크로미움은 환경에 이미 있으면 재사용)
npm test        # 자원 버전 + 셀 문법 + 링크 + 렌더링/인터랙션 검사
npm run measure # 위 검사 + 임베드 권장 높이 측정
```

검사 내용:

- 공용 자원의 **`?v=` 해시가 최신인지** (캐시된 옛 CSS/JS 방지)
- 모든 실습 셀의 **파이썬 문법이 유효한지** (AST 파싱, 337개)
- 페이지 안의 **로컬 링크·자원 경로**가 실제로 존재하는지
- **Colab 링크의 ref 가 `main` 인지, 노트북 파일이 실제로 있는지**
- 모든 페이지에 **JS 오류가 없는지** (`pageerror` / console error)
- **캔버스에 실제로 뭔가 그려졌는지** (빈 화면 방지)
- 버튼·슬라이더·라디오를 **눌러봐도 오류가 안 나는지**
  (슬라이더를 중앙값·양 끝으로 밀어 극단 상태까지 확인)

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
