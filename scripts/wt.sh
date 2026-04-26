#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-}"

case "$cmd" in
  new)
    name="${2:-}"
    if [ -z "$name" ]; then
      echo "usage: scripts/wt.sh new <track-name>"
      exit 1
    fi
    branch="wt/$name"
    path="../whattoeat-$name"
    git fetch origin main
    git worktree add -b "$branch" "$path" origin/main
    cp .env.local "$path/.env.local" 2>/dev/null || true
    echo
    echo "Worktree created at $path on branch $branch"
    echo "Next:"
    echo "  cd $path && bun install && bun run dev -p \$(node -e \"console.log(3000+Math.floor(Math.random()*900))\")"
    ;;
  list)
    git worktree list
    ;;
  remove)
    name="${2:-}"
    if [ -z "$name" ]; then
      echo "usage: scripts/wt.sh remove <track-name>"
      exit 1
    fi
    git worktree remove "../whattoeat-$name"
    git branch -D "wt/$name" 2>/dev/null || true
    ;;
  *)
    echo "usage: scripts/wt.sh {new|list|remove} <track-name>"
    exit 1
    ;;
esac
