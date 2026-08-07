# 폰트 출처 및 라이선스

## NanumGothic-subset.ttf

matplotlib 그래프에서 한글이 깨지지 않도록 포함한 폰트입니다.

| | |
| --- | --- |
| **원본 글꼴** | 나눔고딕 (NanumGothic) |
| **제작·저작권** | NAVER Corporation |
| **라이선스** | SIL Open Font License, Version 1.1 |
| **입수 경로** | PyPI 패키지 [`koreanize-matplotlib`](https://pypi.org/project/koreanize-matplotlib/) 0.1.1 에 포함된 `fonts/NanumGothic.ttf` |
| **가공** | `fontTools.subset` 으로 아래 범위만 남겨 4.47MB → 1.9MB 로 축소 |

### 서브셋에 포함된 문자 범위

- ASCII (U+0020–U+007E) 및 Latin-1 보충 (U+00A0–U+00FF)
- 한글 음절 전체 (U+AC00–U+D7A3, 11,172자)
- 한글 자모 (U+3131–U+3163)
- 문장부호·기호: 따옴표, 대시, 말줄임표, 원화(₩), 화살표, ± × ÷ ≤ ≥ √ ° 등
- 그리스 문자 일부: μ σ α β π Σ (통계 기호용)
- 결합 매크론 U+0304 (x̄ 표기용)

재현 방법은 `scripts/make_font_subset.py` 를 참고하세요.

### ⚠️ 배포 전 확인할 것

SIL Open Font License 1.1은 **라이선스 전문을 폰트와 함께 배포**할 것을 요구합니다.
이 저장소에는 아직 전문이 포함되어 있지 않습니다. 공개 배포하기 전에
<https://openfontlicense.org> 또는 <https://scripts.sil.org/OFL> 에서 OFL 1.1 전문을 받아
이 디렉터리에 `OFL.txt` 로 저장하세요.

OFL 주요 조건 요약 (전문을 대체하지 않습니다):

- 자유롭게 사용·수정·재배포할 수 있습니다.
- 폰트 자체를 **단독으로 판매**할 수 없습니다.
- 수정본을 배포할 때 **"NanumGothic" 이름을 그대로 쓸 수 없습니다.**
  이 파일은 서브셋이므로 파일명을 `NanumGothic-subset.ttf` 로 두었고,
  matplotlib 에는 원본 내부 글꼴명(NanumGothic)으로 등록됩니다.
  엄밀한 준수가 필요하다면 `fontTools` 로 내부 이름도 변경하세요.
