#!/usr/bin/env bash
# Prune local and remote git branches. Dry run by default; pass --apply to actually delete.
#
# Kept: the currently checked-out branch, the remote's default branch (<remote>/HEAD), every branch
# matching a glob pattern in the protected file, and every branch listed in the keep file. Everything
# else is deleted, locally and on the remote. Merged-ness is not checked: squash merges make git
# ancestry unreliable, so protection is explicit.
#
# Protected file (default .cleargit/protected): long-lived branches as bash glob patterns, one per
#   line, e.g. `main`, `develop`, `release/*`. '*' also matches '/'. Required and must not be empty.
# Keep file (default .cleargit/keep): source branches of the open pull requests, one per line,
#   'refs/heads/' prefix optional. Generated per run by the clear-git skill. Required, may be empty.
# '#' starts a comment in both files. Paths are relative to the repository root.
#
# Usage: cleargit.sh [--apply] [--remote NAME] [--protected FILE] [--keep FILE]
set -euo pipefail

REMOTE=origin
PROTECTED_FILE=.cleargit/protected
KEEP_FILE=.cleargit/keep
APPLY=false

usage() { echo "Usage: $0 [--apply] [--remote NAME] [--protected FILE] [--keep FILE]" >&2; exit 1; }

while (($#)); do
    case "$1" in
        --apply) APPLY=true ;;
        --remote) REMOTE=${2:?--remote needs a value}; shift ;;
        --protected) PROTECTED_FILE=${2:?--protected needs a value}; shift ;;
        --keep) KEEP_FILE=${2:?--keep needs a value}; shift ;;
        *) usage ;;
    esac
    shift
done

cd "$(git rev-parse --show-toplevel)"
git remote get-url "$REMOTE" >/dev/null

# Prints the non-comment, non-blank lines of $1, 'refs/heads/' stripped.
read_list() {
    local line
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="${line%%#*}"
        line="${line//[[:space:]]/}"
        if [[ -n "$line" ]]; then echo "${line#refs/heads/}"; fi
    done < "$1"
}

for f in "$PROTECTED_FILE" "$KEEP_FILE"; do
    if [[ ! -f "$f" ]]; then
        echo "$f not found - generate it with the clear-git skill. Nothing deleted." >&2
        exit 1
    fi
done
protected=()
while IFS= read -r p; do protected+=("$p"); done < <(read_list "$PROTECTED_FILE")
pr_branches=()
while IFS= read -r p; do pr_branches+=("$p"); done < <(read_list "$KEEP_FILE")
if ((${#protected[@]} == 0)); then
    echo "$PROTECTED_FILE has no patterns - refusing to run without protected branches. Nothing deleted." >&2
    exit 1
fi
grep '^# Generated' "$KEEP_FILE" || true

echo "Fetching $REMOTE (with prune)..."
git fetch --prune --quiet "$REMOTE"
git remote set-head "$REMOTE" --auto >/dev/null 2>&1 || true

current=$(git symbolic-ref --quiet --short HEAD || true)
default=$(git symbolic-ref --quiet --short "refs/remotes/$REMOTE/HEAD" 2>/dev/null || true)
default=${default#"$REMOTE"/}

is_kept() {
    [[ "$1" == "$current" || "$1" == "$default" ]] && return 0
    local p
    for p in "${protected[@]}"; do
        # shellcheck disable=SC2053 # unquoted on purpose: glob match
        [[ "$1" == $p ]] && return 0
    done
    for p in ${pr_branches[@]+"${pr_branches[@]}"}; do
        [[ "$1" == "$p" ]] && return 0
    done
    return 1
}

print_list() {
    local title=$1; shift
    echo "== $title ($#)"
    if (($#)); then printf '   %s\n' "$@"; fi
    echo
}

local_delete=()
while IFS= read -r branch; do
    is_kept "$branch" || local_delete+=("$branch")
done < <(git for-each-ref --format='%(refname:short)' refs/heads)

remote_delete=()
while IFS= read -r branch; do
    [[ "$branch" == HEAD ]] && continue
    is_kept "$branch" || remote_delete+=("$branch")
done < <(git for-each-ref --format='%(refname:lstrip=3)' "refs/remotes/$REMOTE")

print_list "Kept: open pull request branches" ${pr_branches[@]+"${pr_branches[@]}"}
print_list "Local branches to delete" ${local_delete[@]+"${local_delete[@]}"}
print_list "Remote branches to delete ($REMOTE)" ${remote_delete[@]+"${remote_delete[@]}"}
always=$(printf ', %s' "${protected[@]}")
always=${always#, }
[[ -n "$default" ]] && always+=", $default ($REMOTE default)"
[[ -n "$current" ]] && always+=", $current (current)"
echo "Always kept: $always"

if ! $APPLY; then
    echo
    echo "Dry run - nothing deleted. Re-run with --apply to delete."
    exit 0
fi

echo
read -r -p "Delete ${#local_delete[@]} local and ${#remote_delete[@]} remote branches? Type 'yes': " answer
[[ "$answer" == yes ]] || { echo "Aborted."; exit 1; }

if ((${#local_delete[@]})); then
    git branch -D ${local_delete[@]+"${local_delete[@]}"}
fi

if ((${#remote_delete[@]})); then
    printf '%s\n' ${remote_delete[@]+"${remote_delete[@]}"} | xargs -n 50 git push "$REMOTE" --delete
fi

echo "Done."
