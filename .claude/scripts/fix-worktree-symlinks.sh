#!/bin/bash
# Fixes ios/android symlink depth in FA.worktrees worktrees.
# symlinkDirectories creates 3-level relative paths; correct depth is 4.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_NAME="$(basename "$REPO_ROOT")"

git -C "$REPO_ROOT" worktree list --porcelain \
  | awk '/^worktree/ { print $2 }' \
  | grep "FA.worktrees" \
  | while read -r worktree; do
      nativeapp="$worktree/apps/nativeapp"
      [ -d "$nativeapp" ] || continue

      for d in ios android; do
          link="$nativeapp/$d"
          target="../../../../${REPO_NAME}/apps/nativeapp/$d"

          [ -L "$link" ] || continue

          current="$(readlink "$link")"
          if [ "$current" != "$target" ]; then
              rm -f "$link"
              ln -s "$target" "$link"
              echo "Fixed symlink: $link -> $target"
          fi
      done
  done
