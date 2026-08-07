#!/bin/bash
# Claude Code on the web 세션 시작 훅
#   모듈 스모크 테스트(npm test)를 바로 돌릴 수 있도록 의존성을 준비한다.
set -euo pipefail

# 로컬(사람이 쓰는) 환경에서는 아무것도 하지 않는다.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# playwright-core 설치 (컨테이너 상태가 캐시되므로 install 이 ci 보다 유리하다)
npm install --no-audit --no-fund

# 이 환경에는 크로미움이 미리 깔려 있다. 다시 받지 않도록 경로만 알려준다.
echo 'export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1' >> "$CLAUDE_ENV_FILE"

BROWSERS_DIR="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
if [ -d "$BROWSERS_DIR" ]; then
  echo "export PLAYWRIGHT_BROWSERS_PATH=$BROWSERS_DIR" >> "$CLAUDE_ENV_FILE"
  CHROME_BIN="$(find "$BROWSERS_DIR" -maxdepth 3 -type f -name chrome -path '*chrome-linux*' 2>/dev/null | head -n 1)"
  if [ -n "$CHROME_BIN" ]; then
    echo "export CHROME_PATH=$CHROME_BIN" >> "$CLAUDE_ENV_FILE"
    echo "chromium: $CHROME_BIN"
  fi
fi

echo "session-start hook 완료 — 'npm test' 로 모듈 스모크 테스트를 실행할 수 있습니다."
