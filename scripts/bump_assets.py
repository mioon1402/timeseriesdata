#!/usr/bin/env python3
"""
자원 캐시 무효화 (cache busting)

브라우저와 GitHub Pages 는 css/js 를 오래 캐시한다. 그래서 버그를 고쳐
배포해도 이미 방문한 적 있는 사람은 한동안 옛 파일을 계속 쓴다.
블로그 독자에게 이건 "고쳤는데도 안 고쳐진" 상태로 보인다.

그래서 파일 내용의 해시를 쿼리로 붙인다.

    <script src="../assets/pylab.js?v=a1b2c3d4">

내용이 바뀌면 주소가 바뀌므로 브라우저가 반드시 새로 받는다.
내용이 그대로면 주소도 그대로라 캐시가 계속 살아 있다.

    python3 scripts/bump_assets.py

커밋 전에 실행하면 된다. npm test 가 자동으로 확인해 준다.
"""

import hashlib
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 검사할 HTML 위치
HTML_DIRS = ["", "modules", "python", "linalg", "calc"]

# href/src 안의 assets 경로를 찾는다. 이미 붙어 있는 ?v= 는 갈아끼운다.
REF = re.compile(r'(?P<attr>href|src)="(?P<path>(?:\.\./)?assets/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"')


def short_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:10]


def html_files():
    for d in HTML_DIRS:
        full = os.path.join(HERE, d)
        if not os.path.isdir(full):
            continue
        for name in sorted(os.listdir(full)):
            if name.endswith(".html"):
                yield os.path.join(full, name)


def main():
    check_only = "--check" in sys.argv
    cache = {}
    changed = []
    stale = []

    for page in html_files():
        with open(page, encoding="utf-8") as f:
            src = f.read()

        missing = []

        def repl(m):
            rel = m.group("path")
            target = os.path.normpath(os.path.join(os.path.dirname(page), rel))
            if not os.path.exists(target):
                missing.append(rel)
                return m.group(0)
            if target not in cache:
                cache[target] = short_hash(target)
            return f'{m.group("attr")}="{rel}?v={cache[target]}"'

        out = REF.sub(repl, src)

        if missing:
            print(f"  ! {os.path.relpath(page, HERE)} → 없는 파일 참조: {', '.join(missing)}")

        if out != src:
            rel_page = os.path.relpath(page, HERE)
            if check_only:
                stale.append(rel_page)
            else:
                with open(page, "w", encoding="utf-8") as f:
                    f.write(out)
                changed.append(rel_page)

    if check_only:
        if stale:
            print("자원 버전이 최신이 아닙니다. `python3 scripts/bump_assets.py` 를 실행하세요:")
            for p in stale:
                print("  -", p)
            return 1
        print("  ok   자원 버전 최신")
        return 0

    for name, digest in sorted(cache.items()):
        print(f"  {os.path.relpath(name, HERE):34s} v={digest}")
    print(f"\n{len(changed)}개 HTML 갱신" if changed else "\n변경 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
