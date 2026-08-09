#!/usr/bin/env python3
"""
모든 강의의 실습 셀을 파싱해 파이썬 문법 오류를 잡는다.

브라우저 테스트는 Pyodide 를 실제로 돌리지 않으므로(CDN 필요),
'식별자가 숫자로 시작' 같은 오류는 독자가 [실행] 을 눌러야 드러난다.
그런 건 커밋 전에 잡혀야 한다.

    python3 scripts/check_cells.py
"""

import ast
import html
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRS = ["python", "linalg", "calc"]
CELL = re.compile(r'<div class="pycell"([^>]*)>([\s\S]*?)</div>')
TITLE = re.compile(r'data-title="([^"]*)"')


def dedent(raw):
    lines = raw.replace("\t", "    ").strip("\n").rstrip().split("\n")
    widths = [len(l) - len(l.lstrip()) for l in lines if l.strip()]
    base = min(widths) if widths else 0
    return "\n".join(l[base:] for l in lines)


def main():
    problems = []
    n_cells = 0

    for folder in DIRS:
        d = os.path.join(HERE, folder)
        if not os.path.isdir(d):
            continue
        for name in sorted(f for f in os.listdir(d) if f.endswith(".html")):
            src = open(os.path.join(d, name), encoding="utf-8").read()
            for i, m in enumerate(CELL.finditer(src), 1):
                n_cells += 1
                attrs, body = m.group(1), m.group(2)
                t = TITLE.search(attrs)
                label = t.group(1) if t else f"셀 {i}"
                code = html.unescape(dedent(body))
                try:
                    ast.parse(code)
                except SyntaxError as e:
                    line = code.split("\n")[e.lineno - 1] if e.lineno else ""
                    problems.append(
                        f"{folder}/{name} [{label}] {e.msg}\n"
                        f"      {e.lineno}행: {line.strip()}"
                    )

    print(f"· 실습 셀 문법 검사  ({n_cells}개)")
    if problems:
        print("  FAIL 문법 오류:")
        for p in problems:
            print("       " + p)
        return 1
    print("  ok   문법 오류 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
