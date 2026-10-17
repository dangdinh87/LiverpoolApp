#!/bin/bash
# Copy of ~/.local/bin/deploy-notify so GitHub Actions can run it; keep the two in sync.
# deploy-notify "<project>" ["<extra line>"] — shared "deploy succeeded" ping for any project.
#
# Optional env (all best-effort, missing ones are skipped):
#   DEPLOY_URL       public URL            DEPLOY_VERSION  build/version id
#   DEPLOY_ENV       default "production"  DEPLOY_STARTED  epoch seconds at build start
#   DEPLOY_REPO      git checkout that was built (default: current dir)
#   DEPLOY_DASH_URL  deploy page on the host (Cloudflare / Vercel) — shown as a link
# In GitHub Actions the run link is added automatically.
#
# Credentials: DEPLOY_BOT_TOKEN + DEPLOY_CHAT_ID from the env (CI secrets), else from
# ~/.config/deploy-notify/env (chmod 600).
# Until that file exists it falls back to cv-app's bug-report bot, never the order bot.
# Also shows a macOS notification. Never fails the caller.
PROJECT="$1"; EXTRA="$2"
CONF="$HOME/.config/deploy-notify/env"
if [ -n "$DEPLOY_BOT_TOKEN" ] && [ -n "$DEPLOY_CHAT_ID" ]; then
  TOKEN="$DEPLOY_BOT_TOKEN"; CHAT="$DEPLOY_CHAT_ID"   # CI: repo secrets
elif [ -f "$CONF" ]; then
  # shellcheck disable=SC1090
  . "$CONF"; TOKEN="$DEPLOY_BOT_TOKEN"; CHAT="$DEPLOY_CHAT_ID"
else
  ENVF=/Users/nguyendangdinh/DINH_CV/cv-app/.env.local
  val() { grep -E "^$1=" "$ENVF" 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e 's/\\n$//' | tr -d '\r\n'; }
  TOKEN=$(val TELEGRAM_BUG_BOT_TOKEN); CHAT=$(val TELEGRAM_BUG_CHAT_ID)
fi

REPO="${DEPLOY_REPO:-$PWD}"
g() { git -C "$REPO" "$@" 2>/dev/null; }
esc() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }
link() { printf '<a href="%s">%s</a>' "$1" "$(esc "$2")"; }
# git@github.com:owner/repo.git | https://github.com/owner/repo(.git) → https://github.com/owner/repo
WEB=$(g remote get-url origin | sed -E -e 's#^git@([^:]+):#https://\1/#' -e 's#\.git$##')
LINES=()
[ -n "$DEPLOY_URL" ] && LINES+=("🌐 $(link "$DEPLOY_URL" "${DEPLOY_URL#https://}")")
LINES+=("🏷 $(esc "${DEPLOY_ENV:-production}")${DEPLOY_VERSION:+ · $(esc "$DEPLOY_VERSION")}")
if g rev-parse --git-dir >/dev/null; then
  BRANCH=$(g rev-parse --abbrev-ref HEAD); SHA=$(g rev-parse HEAD); SHORT=${SHA:0:7}
  SUBJ=$(g log -1 --format='%s')
  if [ -n "$WEB" ]; then
    LINES+=("🌿 $(link "$WEB/tree/$BRANCH" "$BRANCH") · $(link "$WEB/commit/$SHA" "$SHORT") — $(esc "$SUBJ")")
  else
    LINES+=("🌿 $(esc "$BRANCH") · ${SHORT} — $(esc "$SUBJ")")
  fi
  LINES+=("👤 $(esc "$(g log -1 --format='%an · %ar')")")
  DIRTY=$(g status --porcelain | wc -l | tr -d ' ')
  [ "$DIRTY" != "0" ] && LINES+=("⚠️ build kèm ${DIRTY} file chưa commit")
fi
[ -n "$GITHUB_RUN_ID" ] && LINES+=("⚙️ $(link "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}" "GitHub Actions #${GITHUB_RUN_NUMBER:-$GITHUB_RUN_ID}")")
[ -n "$DEPLOY_DASH_URL" ] && LINES+=("📊 $(link "$DEPLOY_DASH_URL" "Trang deploy")")
if [ -n "$DEPLOY_STARTED" ]; then
  S=$(( $(date +%s) - DEPLOY_STARTED )); LINES+=("⏱ $((S / 60))m$((S % 60))s")
fi
[ -n "$EXTRA" ] && LINES+=("📝 $(esc "$EXTRA")")
HOST=${GITHUB_ACTIONS:+GitHub Actions}; HOST=${HOST:-$(scutil --get ComputerName 2>/dev/null || hostname)}
LINES+=("💻 $(esc "$HOST") · 🕐 $(TZ=Asia/Ho_Chi_Minh date '+%H:%M %d/%m/%Y')")

TEXT="🚀 <b>$(esc "$PROJECT")</b> — deploy thành công"
for l in "${LINES[@]}"; do TEXT+=$'\n'"$l"; done

if [ -n "$TOKEN" ] && [ -n "$CHAT" ]; then
  curl -s -m 15 -o /dev/null -w "telegram %{http_code}\n" \
    --data-urlencode "chat_id=${CHAT}" --data-urlencode "text=${TEXT}" \
    --data-urlencode "disable_web_page_preview=true" --data-urlencode "parse_mode=HTML" \
    "https://api.telegram.org/bot${TOKEN}/sendMessage" || true
fi
SUB="${DEPLOY_URL:-${DEPLOY_ENV:-production}}"
command -v osascript >/dev/null && osascript -e "display notification \"${SUB//\"/}\" with title \"🚀 ${PROJECT//\"/} deploy thành công\" sound name \"Glass\"" 2>/dev/null || true
exit 0
