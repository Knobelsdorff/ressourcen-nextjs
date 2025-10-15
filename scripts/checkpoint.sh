#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   npm run checkpoint "stable before <feature-name>"
#   npm run start-feature <feature-name>

ACTION=${1:-checkpoint}
FEATURE_NAME=${2:-${2:-}}

timestamp() {
  date +"%Y%m%d-%H%M%S"
}

checkpoint() {
  local msg=${1:-"checkpoint: stable"}
  # Ensure scripts dir
  git add -A >/dev/null 2>&1 || true
  # Create a lightweight commit if there are staged/unstaged changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    git add -A
    git commit -m "${msg}"
  fi
  local tag="checkpoint-${FEATURE_NAME:-manual}-$(timestamp)"
  git tag -a "$tag" -m "$msg"
  echo "Created tag: $tag"
}

start_feature() {
  local name=${1:?"feature name required"}
  checkpoint "checkpoint: stable before ${name}"
  local branch="feature/${name}"
  git switch -c "$branch" || git checkout -b "$branch"
  echo "Switched to branch: $branch"
}

case "$ACTION" in
  checkpoint)
    checkpoint "${2:-checkpoint: manual}"
    ;;
  start-feature)
    start_feature "${2:?feature name missing}"
    ;;
  *)
    echo "Unknown action: $ACTION"
    echo "Usage: bash scripts/checkpoint.sh [checkpoint <message>| start-feature <name>]"
    exit 1
    ;;
esac


