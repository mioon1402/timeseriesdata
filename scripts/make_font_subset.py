#!/usr/bin/env python3
"""
matplotlib 한글 표시용 폰트 서브셋 생성기.

Pyodide 안의 matplotlib 은 기본 폰트(DejaVu)에 한글 글리프가 없어서
한글 라벨이 전부 □□□ 로 나온다. 그래서 한글 폰트를 브라우저로 내려받아
런타임에 등록하는데, 원본 나눔고딕은 4.5MB 라 필요한 범위만 남겨 줄인다.

    pip install fonttools
    python3 scripts/make_font_subset.py

결과: assets/fonts/NanumGothic-subset.ttf  (약 1.9MB)

원본은 PyPI 의 koreanize-matplotlib 패키지에 포함된 NanumGothic.ttf 를 쓴다.
라이선스는 assets/fonts/NOTICE.md 참고.
"""

import os
import subprocess
import sys
import tempfile
import zipfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "assets", "fonts", "NanumGothic-subset.ttf")


def fetch_source(workdir):
    """koreanize-matplotlib 휠을 받아 NanumGothic.ttf 를 꺼낸다."""
    subprocess.check_call([
        sys.executable, "-m", "pip", "download", "koreanize-matplotlib",
        "--no-deps", "-q", "-d", workdir,
    ])
    whl = next(f for f in os.listdir(workdir) if f.endswith(".whl"))
    with zipfile.ZipFile(os.path.join(workdir, whl)) as z:
        member = "koreanize_matplotlib/fonts/NanumGothic.ttf"
        z.extract(member, workdir)
    return os.path.join(workdir, member)


def wanted_codepoints():
    cps = []
    cps += range(0x20, 0x7F)          # ASCII
    cps += range(0xA0, 0x100)         # Latin-1 보충
    cps += range(0x3131, 0x3164)      # 한글 자모
    cps += range(0xAC00, 0xD7A4)      # 한글 음절 11,172자
    cps += [
        0x2018, 0x2019, 0x201C, 0x201D,           # 따옴표
        0x2013, 0x2014, 0x2026, 0x00B7,           # 대시·말줄임표·가운뎃점
        0x20A9,                                    # 원화 ₩
        0x2190, 0x2191, 0x2192, 0x2193,           # 화살표
        0x00B0, 0x00B1, 0x00D7, 0x00F7,           # ° ± × ÷
        0x2264, 0x2265, 0x221A, 0x2211,           # ≤ ≥ √ Σ
        0x03B1, 0x03B2, 0x03BC, 0x03C0, 0x03C3,   # α β μ π σ
        0x0304,                                    # 결합 매크론 (x̄)
    ]
    # 그래프 축 라벨에 자주 쓰는 단위 기호.
    # ℃ 가 빠져 있으면 "기온(℃)" 라벨이 통째로 □ 로 나온다.
    cps += range(0x2100, 0x2150)      # ℃ ℉ ™ № ℓ 등 (Letterlike Symbols)
    cps += range(0x3380, 0x33E0)      # ㎏ ㎝ ㎞ ㎡ ㎥ ㎖ 등 (CJK 단위 기호)
    return list(cps)


def main():
    from fontTools import subset

    with tempfile.TemporaryDirectory() as tmp:
        src = fetch_source(tmp)
        before = os.path.getsize(src) / 1048576

        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        opts.recalc_bounds = True
        # TSI* (VTT 힌팅 소스) 는 서브셋 대상이 아니라 경고만 뜬다. 무시해도 된다.
        opts.drop_tables += ["TSI0", "TSI1", "TSI2", "TSI3", "TSI5"]

        font = subset.load_font(src, opts)
        sub = subset.Subsetter(options=opts)
        sub.populate(unicodes=wanted_codepoints())
        sub.subset(font)

        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        subset.save_font(font, OUT, opts)

    after = os.path.getsize(OUT) / 1048576
    print(f"{before:.2f} MB → {after:.2f} MB   {os.path.relpath(OUT, HERE)}")


if __name__ == "__main__":
    main()
