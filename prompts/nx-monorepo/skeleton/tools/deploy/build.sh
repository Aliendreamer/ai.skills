#!/usr/bin/env bash
# Build one <AppName> app image (and, by default, push it to ACR).
#
#   tools/deploy/build.sh <proxy|frontend|backend> [push|local|validate]
#
#   push      (default) build, log in to ACR, push, and print the deployable tag
#   local     build the image locally only (no creds, no push) -> <image>:local
#   validate  build locally, then run `nginx -t` inside it (proxy config check)
#
# No dev/prod variants: a single build path per app. The printed YYYYMMDD.<short-git-sha>
# tag IS the deployable version — roll back by re-pointing your deploy target at a prior tag.
# This script never touches any deployment manifest.
#
# Registry settings (push mode only) come from the environment: ACR_REGISTRY, ACR_USER, ACR_PASS,
# IMAGE_NAMESPACE. Source them from your own credential store before calling this — deliberately no
# file fallback, so nothing here reaches for a path outside the repo.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

usage() {
  echo "Usage: $0 <proxy|frontend|backend> [push|local|validate]" >&2
  exit 1
}

APP="${1:-}"
MODE="${2:-push}"
[ -n "$APP" ] || usage

# Per-app image name, build context, and Dockerfile. IMAGE_NAMESPACE is the path prefix inside the
# registry (optional for local/validate), so FULL_IMAGE = $ACR_REGISTRY/$IMAGE_NAMESPACE/<name>.
IMAGE_PREFIX="${IMAGE_NAMESPACE:+$IMAGE_NAMESPACE/}"
case "$APP" in
  proxy)
    IMAGE_NAME="${IMAGE_PREFIX}<app-name>-proxy"
    CONTEXT="$REPO_ROOT/apps/proxy"
    DOCKERFILE="$REPO_ROOT/apps/proxy/Dockerfile"
    ;;
  frontend)
    # The SSR BFF Dockerfile builds from the repo root (pnpm workspace).
    IMAGE_NAME="${IMAGE_PREFIX}<app-name>-frontend"
    CONTEXT="$REPO_ROOT"
    DOCKERFILE="$REPO_ROOT/apps/frontend/Dockerfile"
    ;;
  backend)
    # Publishes the project (not the .slnx); context is the backend dir.
    IMAGE_NAME="${IMAGE_PREFIX}<app-name>-backend"
    CONTEXT="$REPO_ROOT/apps/backend"
    DOCKERFILE="$REPO_ROOT/apps/backend/Dockerfile"
    ;;
  *)
    usage
    ;;
esac

case "$MODE" in
  push | local) ;;
  validate) [[ "$APP" == "proxy" ]] || { echo "validate is proxy-only (it runs nginx -t)" >&2; exit 1; } ;;
  *) usage ;;
esac

if command -v docker &>/dev/null; then
  CONTAINER_RUNTIME="docker"
elif command -v podman &>/dev/null; then
  CONTAINER_RUNTIME="podman"
else
  echo "ERROR: Neither docker nor podman found" >&2
  exit 1
fi

# Local build + optional config check — no credentials, no registry.
if [[ "$MODE" != "push" ]]; then
  LOCAL_IMAGE="${IMAGE_NAME}:local"
  echo "Building $LOCAL_IMAGE ($CONTAINER_RUNTIME, mode=$MODE)..." >&2
  $CONTAINER_RUNTIME build -f "$DOCKERFILE" -t "$LOCAL_IMAGE" "$CONTEXT" >&2
  if [[ "$MODE" == "validate" ]]; then
    # nginx resolves proxy_pass hosts at load time, and the in-cluster *.svc.cluster.local names do
    # not resolve outside the cluster. Map each one to a dummy address so `nginx -t` checks the
    # config itself, without changing how production resolves upstreams.
    ADD_HOSTS=()
    while IFS= read -r host; do
      ADD_HOSTS+=(--add-host "$host:127.0.0.1")
    done < <(grep -E '^[[:space:]]*proxy_pass[[:space:]]+https?://[^$]' "$CONTEXT/files/nginx.conf" |
      sed -E 's#^[[:space:]]*proxy_pass[[:space:]]+https?://([^:/;]+).*#\1#' | sort -u)
    echo "Validating nginx config in $LOCAL_IMAGE..." >&2
    $CONTAINER_RUNTIME run --rm "${ADD_HOSTS[@]}" "$LOCAL_IMAGE" nginx -t
  fi
  exit 0
fi

TAG="$(date +%Y%m%d).$(git -C "$REPO_ROOT" rev-parse --short HEAD)"

: "${ACR_REGISTRY:?Missing ACR_REGISTRY — export it or supply it from your credential store}"
: "${ACR_USER:?Missing ACR_USER — export it or supply it from your credential store}"
: "${ACR_PASS:?Missing ACR_PASS — export it or supply it from your credential store}"
: "${IMAGE_NAMESPACE:?Missing IMAGE_NAMESPACE — export it or supply it from your credential store}"

FULL_IMAGE="${ACR_REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "========================================" >&2
echo "  Runtime:  $CONTAINER_RUNTIME"           >&2
echo "  App:      $APP"                          >&2
echo "  Image:    $FULL_IMAGE"                   >&2
echo "  Context:  $CONTEXT"                      >&2
echo "========================================" >&2

echo "Building..." >&2
$CONTAINER_RUNTIME build -f "$DOCKERFILE" -t "$FULL_IMAGE" "$CONTEXT" >&2

echo "Logging into $ACR_REGISTRY..." >&2
echo "$ACR_PASS" | $CONTAINER_RUNTIME login "$ACR_REGISTRY" -u "$ACR_USER" --password-stdin >&2

echo "Pushing..." >&2
$CONTAINER_RUNTIME push "$FULL_IMAGE" >&2

echo "========================================" >&2
echo "  Done: $FULL_IMAGE"                       >&2
echo "  Tag:  $TAG"                              >&2
echo "========================================" >&2

# Final stdout line: the tag, for the operator (or a deploy step) to consume.
echo "$TAG"
