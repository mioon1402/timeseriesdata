#!/usr/bin/env python3
"""
강의 HTML(python/*.html)에서 Colab 노트북(notebooks/*.ipynb)을 생성한다.

웹 강의와 노트북을 따로 관리하면 반드시 어긋난다. 그래서 웹 강의를
단일 원본(single source of truth)으로 두고, 실습 셀만 뽑아 노트북을 만든다.

  · 웹 강의  = 설명 + 실습   (읽으면서 바로 해보는 용도)
  · 노트북   = 실습 + 소제목  (자유롭게 파고드는 용도, 설명은 원문 링크)

    python3 scripts/make_notebooks.py
"""

import html
import json
import os
import re
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 실습 셀이 들어 있는 강의 폴더들. 노트북은 전부 notebooks/ 하나에 모은다.
SRC_DIRS = ["python", "linalg"]
OUT_DIR = os.path.join(HERE, "notebooks")

REPO = "mioon1402/timeseriesdata"
BRANCH = "main"
RAW = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}"
SITE = "https://mioon1402.github.io/timeseriesdata"


class LessonParser(HTMLParser):
    """제목 · 소제목 · 실습 셀만 순서대로 추출한다."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.eyebrow = ""
        self.blocks = []          # [("h2", 텍스트) | ("code", 코드, 제목, 패키지, 데이터)]
        self._mode = None
        self._buf = []
        self._cell_attrs = {}
        self._depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class", "")

        if self._mode == "code":
            self._depth += 1
            return

        if tag == "div" and "pycell" in cls.split():
            self._mode = "code"
            self._buf = []
            self._depth = 0
            self._cell_attrs = a
        elif tag == "h1":
            self._mode = "h1"
            self._buf = []
        elif tag == "h2":
            self._mode = "h2"
            self._buf = []
        elif tag == "p" and "eyebrow" in cls:
            self._mode = "eyebrow"
            self._buf = []

    def handle_endtag(self, tag):
        if self._mode == "code":
            if tag == "div" and self._depth == 0:
                code = dedent("".join(self._buf))
                a = self._cell_attrs
                self.blocks.append((
                    "code", code,
                    a.get("data-title", ""),
                    a.get("data-packages", ""),
                    a.get("data-data", ""),
                ))
                self._mode = None
            else:
                self._depth -= 1
            return

        if self._mode == "h1" and tag == "h1":
            self.title = clean("".join(self._buf))
            self._mode = None
        elif self._mode == "h2" and tag == "h2":
            self.blocks.append(("h2", clean("".join(self._buf))))
            self._mode = None
        elif self._mode == "eyebrow" and tag == "p":
            self.eyebrow = clean("".join(self._buf))
            self._mode = None

    def handle_data(self, data):
        if self._mode:
            self._buf.append(data)


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


def dedent(raw):
    raw = raw.replace("\t", "    ")
    lines = raw.replace("\r", "").strip("\n").rstrip().split("\n")
    widths = [len(l) - len(l.lstrip()) for l in lines if l.strip()]
    base = min(widths) if widths else 0
    return "\n".join(l[base:] for l in lines)


def as_source(text):
    """
    .ipynb 의 source 는 '줄바꿈을 포함한' 문자열의 리스트다.
    마지막 줄을 제외한 각 줄 끝에 \\n 이 있어야 Colab 에서 줄이 살아난다.
    """
    lines = text.split("\n")
    return [l + "\n" for l in lines[:-1]] + [lines[-1]]


def md(source):
    return {"cell_type": "markdown", "metadata": {}, "source": as_source(source)}


def code(source):
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": as_source(source),
    }


def build_notebook(path, folder):
    with open(path, encoding="utf-8") as f:
        raw = f.read()

    p = LessonParser()
    p.feed(raw)

    slug = os.path.splitext(os.path.basename(path))[0]
    data_files = sorted({
        name.strip()
        for b in p.blocks if b[0] == "code"
        for name in b[4].split(",") if name.strip()
    })
    packages = sorted({
        name.strip()
        for b in p.blocks if b[0] == "code"
        for name in b[3].split(",") if name.strip()
    })

    cells = [md(
        f"# {p.title}\n"
        f"\n"
        f"> {p.eyebrow}\n"
        f"\n"
        f"이 노트북은 웹 강의의 **실습 부분만** 옮겨온 것입니다.\n"
        f"자세한 설명과 그림은 원문을 함께 보세요 → "
        f"[{p.title}]({SITE}/{folder}/{slug}.html)\n"
        f"\n"
        f"---\n"
        f"\n"
        f"**먼저 아래 준비 셀을 한 번 실행하세요.**"
    )]

    # 준비 셀 — 데이터 내려받기 (+ 필요하면 설치)
    setup = []
    if data_files:
        setup.append("# 예시 데이터 내려받기")
        for name in data_files:
            setup.append(f'!wget -q -nc {RAW}/data/{name}')
    if "seaborn" in packages:
        setup.append("")
        setup.append("# Colab 에는 대부분 설치돼 있지만, 없으면 아래 주석을 푸세요")
        setup.append("# !pip install -q seaborn")
    if "pandas" in packages:
        setup.append("")
        setup.append("# 표를 글자로 찍을 때 한글 열이 어긋나지 않게 (한글을 두 칸으로 계산)")
        setup.append("import pandas as pd")
        setup.append('pd.set_option("display.unicode.east_asian_width", True)')
    if "matplotlib" in packages or "seaborn" in packages:
        setup.append("")
        setup.append("# 그래프 한글 깨짐 방지")
        setup.append("!pip install -q koreanize-matplotlib")
        setup.append("import koreanize_matplotlib  # noqa: F401")
    setup.append("")
    setup.append("print('준비 완료')")
    cells.append(code("\n".join(setup)))

    for b in p.blocks:
        if b[0] == "h2":
            cells.append(md(f"## {b[1]}"))
        else:
            _, src, title, _, _ = b
            if title:
                cells.append(md(f"**{title}**"))
            cells.append(code(src))

    cells.append(md(
        "---\n"
        "\n"
        f"전체 강의 목록 → [눈으로 보는 수학·통계]({SITE}/)"
    ))

    nb = {
        "cells": cells,
        "metadata": {
            "colab": {"provenance": [], "toc_visible": True},
            "kernelspec": {"display_name": "Python 3", "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 0,
    }
    return slug, nb, len([c for c in cells if c["cell_type"] == "code"])


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    total = 0
    for folder in SRC_DIRS:
        d = os.path.join(HERE, folder)
        if not os.path.isdir(d):
            continue
        for name in sorted(f for f in os.listdir(d) if f.endswith(".html")):
            slug, nb, n_code = build_notebook(os.path.join(d, name), folder)
            if n_code == 0:
                continue                      # 실습 셀이 없는 페이지는 노트북을 만들지 않는다
            out = os.path.join(OUT_DIR, slug + ".ipynb")
            with open(out, "w", encoding="utf-8") as f:
                json.dump(nb, f, ensure_ascii=False, indent=1)
                f.write("\n")
            total += 1
            print(f"{os.path.relpath(out, HERE):40s} 코드 셀 {n_code}개")
    if not total:
        print("강의 파일을 찾지 못했습니다.")


if __name__ == "__main__":
    main()
