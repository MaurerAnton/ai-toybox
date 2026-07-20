#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# CLI-LOG HOOK — logs every command with metadata
# Add to .bashrc/.zshrc:
#   source ~/ai-toybox/cli-log/hook.sh
# ═══════════════════════════════════════════════════════════════

CLI_LOG_DIR="${HOME}/.cli-log"
CLI_LOG_FILE="${CLI_LOG_DIR}/$(date +%Y-%m-%d).jsonl"
CLI_LOG_LAST_PWD=""
CLI_LOG_LAST_CMD=""

# Create dir if missing
mkdir -p "$CLI_LOG_DIR" 2>/dev/null

# Secret filter: strip sensitive patterns
_cli_log_redact() {
  echo "$1" | sed -E \
    -e 's/(password|token|key|secret|api_key|apikey|auth)[= :]+[^\s,;]+/\1=[REDACTED]/gi' \
    -e 's/(ghp_|sk-|gho_|github_pat_)[a-zA-Z0-9]+/\1[REDACTED]/g' \
    -e 's/[a-f0-9]{40}/[HASH]/g' \
    -e 's/Bearer [a-zA-Z0-9._-]+/Bearer [REDACTED]/g'
}

# Hook: runs before each prompt
_cli_log_hook() {
  local exit_code=$?
  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local pwd_now="$PWD"
  local last_cmd
  last_cmd=$(history 1 | sed 's/^[ ]*[0-9]*[ ]*//')

  # Skip duplicates and empty
  [ -z "$last_cmd" ] && return
  [ "$last_cmd" = "$CLI_LOG_LAST_CMD" ] && [ "$pwd_now" = "$CLI_LOG_LAST_PWD" ] && return

  CLI_LOG_LAST_CMD="$last_cmd"
  CLI_LOG_LAST_PWD="$pwd_now"

  # Redact secrets
  local safe_cmd
  safe_cmd=$(_cli_log_redact "$last_cmd")

  # Git info if in repo
  local git_branch=""
  local git_repo=""
  if git rev-parse --git-dir &>/dev/null 2>&1; then
    git_branch=$(git branch --show-current 2>/dev/null || echo "")
    git_repo=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "")
  fi

  # Write JSONL
  printf '{"t":"%s","cmd":"%s","pwd":"%s","code":%d,"branch":"%s","repo":"%s"}\n' \
    "$now" \
    "$(echo "$safe_cmd" | sed 's/"/\\"/g')" \
    "$pwd_now" \
    "$exit_code" \
    "$git_branch" \
    "$git_repo" \
    >> "$CLI_LOG_FILE"
}

# For bash
if [ -n "$BASH_VERSION" ]; then
  PROMPT_COMMAND="_cli_log_hook${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
fi

# For zsh
if [ -n "$ZSH_VERSION" ]; then
  precmd_functions=(_cli_log_hook $precmd_functions)
fi

echo "[cli-log] hook loaded — commands logged to ${CLI_LOG_DIR}/"
