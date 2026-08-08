#!/usr/bin/env python3
"""
python/ 에 있는 강의 파일을 자동으로 등록한다.

강의를 하나 추가할 때마다 index.html 과 check-modules.mjs 를 손으로 고치면
반드시 하나를 빠뜨린다. 파일 목록을 단일 출처로 삼아 두 곳을 맞춘다.

    python3 scripts/register_lessons.py
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY_DIR = os.path.join(HERE, "python")


def existing_lessons():
    """{'P01': 'python/p01-first-look.html', ...}"""
    out = {}
    for name in sorted(os.listdir(PY_DIR)):
        m = re.match(r"p(\d\d)-", name)
        if m and name.endswith(".html"):
            out["P" + m.group(1)] = f"python/{name}"
    return out


def update_index(lessons):
    path = os.path.join(HERE, "index.html")
    src = open(path, encoding="utf-8").read()
    changed = []

    def repl(m):
        no = m.group("no")
        if no not in lessons:
            return m.group(0)
        want_file, want_done = lessons[no], "true"
        if m.group("file") == want_file and m.group("done") == want_done:
            return m.group(0)
        changed.append(no)
        return (f"{{ no: '{no}', file: '{want_file}', done: {want_done},")

    pattern = re.compile(
        r"\{ no: '(?P<no>P\d\d)', file: '(?P<file>[^']*)', done: (?P<done>true|false),"
    )
    out = pattern.sub(repl, src)
    if out != src:
        open(path, "w", encoding="utf-8").write(out)
    return changed


def update_checker(lessons):
    path = os.path.join(HERE, "scripts", "check-modules.mjs")
    src = open(path, encoding="utf-8").read()
    paths = [lessons[k] for k in sorted(lessons)]

    pages_block = "".join(f"  '{p}',\n" for p in paths)
    out = re.sub(
        r"(  'modules/08-simpson\.html',\n)(?:  'python/[^']+',\n)*(\];)",
        lambda m: m.group(1) + pages_block + m.group(2),
        src,
    )

    no_canvas = ", ".join(["'index.html'"] + [f"'{p}'" for p in paths])
    out = re.sub(
        r"const NO_CANVAS = new Set\(\[[^\]]*\]\);",
        f"const NO_CANVAS = new Set([{no_canvas}]);",
        out,
    )

    if out != src:
        open(path, "w", encoding="utf-8").write(out)
        return True
    return False


def main():
    lessons = existing_lessons()
    if not lessons:
        print("python/ 에 강의 파일이 없습니다.")
        return 1

    changed = update_index(lessons)
    checker = update_checker(lessons)

    print(f"강의 {len(lessons)}개 발견: {', '.join(sorted(lessons))}")
    if changed:
        print("index.html 갱신:", ", ".join(changed))
    if checker:
        print("check-modules.mjs 갱신")
    if not changed and not checker:
        print("이미 최신 상태")
    return 0


if __name__ == "__main__":
    sys.exit(main())
