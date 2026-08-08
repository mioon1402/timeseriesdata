#!/usr/bin/env python3
"""
강의 파일을 자동으로 등록한다.

강의를 하나 추가할 때마다 index.html 과 check-modules.mjs 를 손으로 고치면
반드시 하나를 빠뜨린다. 파일 목록을 단일 출처로 삼아 두 곳을 맞춘다.

  · python/pNN-*.html  파이썬 데이터 분석 (캔버스 없음)
  · linalg/LNN-*.html  선형대수 (캔버스 있음)

    python3 scripts/register_lessons.py
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (폴더, 파일명 접두 정규식, 번호 접두, 캔버스가 있는가)
SERIES = [
    ("python", r"p(\d\d)-", "P", False),
    ("linalg", r"L(\d\d)-", "L", True),
]


def existing_lessons():
    """[('P01', 'python/p01-first-look.html', has_canvas), ...] 를 시리즈 순서대로"""
    out = []
    for folder, pat, prefix, has_canvas in SERIES:
        d = os.path.join(HERE, folder)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            m = re.match(pat, name)
            if m and name.endswith(".html"):
                out.append((prefix + m.group(1), f"{folder}/{name}", has_canvas))
    return out


def update_index(lessons):
    """실제로 존재하는 강의는 done: true 로 바꾼다."""
    path = os.path.join(HERE, "index.html")
    src = open(path, encoding="utf-8").read()
    have = {no: file for no, file, _ in lessons}
    changed = []

    def repl(m):
        no = m.group("no")
        if no not in have:
            return m.group(0)
        if m.group("file") == have[no] and m.group("done") == "true":
            return m.group(0)
        changed.append(no)
        return f"{{ no: '{no}', file: '{have[no]}', done: true,"

    pattern = re.compile(
        r"\{ no: '(?P<no>[PL]\d\d)', file: '(?P<file>[^']*)', done: (?P<done>true|false),"
    )
    out = pattern.sub(repl, src)
    if out != src:
        open(path, "w", encoding="utf-8").write(out)
    return changed


def update_checker(lessons):
    path = os.path.join(HERE, "scripts", "check-modules.mjs")
    src = open(path, encoding="utf-8").read()
    paths = [file for _, file, _ in lessons]

    pages_block = "".join(f"  '{p}',\n" for p in paths)
    out = re.sub(
        r"(  'modules/08-simpson\.html',\n)(?:  '(?:python|linalg)/[^']+',\n)*(\];)",
        lambda m: m.group(1) + pages_block + m.group(2),
        src,
    )

    # 캔버스가 없어도 정상인 페이지만 NO_CANVAS 에 넣는다.
    # 선형대수 강의는 그림이 핵심이라 캔버스가 비면 실패로 잡혀야 한다.
    no_canvas = ["'index.html'"] + [
        f"'{file}'" for _, file, has_canvas in lessons if not has_canvas
    ]
    out = re.sub(
        r"const NO_CANVAS = new Set\(\[[^\]]*\]\);",
        "const NO_CANVAS = new Set([" + ", ".join(no_canvas) + "]);",
        out,
    )

    if out != src:
        open(path, "w", encoding="utf-8").write(out)
        return True
    return False


def main():
    lessons = existing_lessons()
    if not lessons:
        print("강의 파일을 찾지 못했습니다.")
        return 1

    changed = update_index(lessons)
    checker = update_checker(lessons)

    by_series = {}
    for no, _, _ in lessons:
        by_series.setdefault(no[0], []).append(no)
    summary = ", ".join(f"{k} {len(v)}개" for k, v in sorted(by_series.items()))
    print(f"강의 {len(lessons)}개 발견 ({summary})")

    if changed:
        print("index.html 갱신:", ", ".join(changed))
    if checker:
        print("check-modules.mjs 갱신")
    if not changed and not checker:
        print("이미 최신 상태")
    return 0


if __name__ == "__main__":
    sys.exit(main())
