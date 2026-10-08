#!/usr/bin/env bash
# shellcheck shell=bash
# Make a D-Bus session bus with a Secret Service (GNOME Keyring) available to this shell, so Git Credential
# Manager can keep the Microsoft (MSAL) token cache encrypted instead of falling back to plain text. Built for WSL
# without systemd, where nothing else starts a session bus.
#
# Reuses before it starts: the bus already in the environment, then the one saved by an earlier shell, and only
# then a new `dbus-launch`. GNOME Keyring is started only when no Secret Service owns the bus. Sourcing it in
# every terminal therefore does not pile up daemons.
#
# Usage:
#   . gcm-keyring-session.sh          # from ~/.zshrc or ~/.bashrc (bash and zsh); silent on success
#   gcm-keyring-session.sh --check    # report the state; exit 0 only when a bus with Secret Service is reachable
#
# Env:
#   GCM_KEYRING_ENV  file holding the saved session
#                    (default: ${XDG_RUNTIME_DIR:-$HOME/.cache}/gcm-keyring-session.env)

_gks_env_file=${GCM_KEYRING_ENV:-${XDG_RUNTIME_DIR:-$HOME/.cache}/gcm-keyring-session.env}

_gks_sourced=0
case ${ZSH_EVAL_CONTEXT:-} in *:file*) _gks_sourced=1 ;; esac
if [ -n "${BASH_VERSION:-}" ] && [ "${BASH_SOURCE[0]:-$0}" != "$0" ]; then _gks_sourced=1; fi

# _gks_dbus ADDRESS METHOD [ARGS...] — call the bus daemon itself at ADDRESS.
_gks_dbus() {
  _gks_addr=$1
  _gks_method=$2
  shift 2
  DBUS_SESSION_BUS_ADDRESS=$_gks_addr dbus-send --session --print-reply --reply-timeout=2000 \
    --dest=org.freedesktop.DBus / "org.freedesktop.DBus.$_gks_method" "$@" 2>/dev/null
}

_gks_bus_ok() { [ -n "$1" ] && _gks_dbus "$1" GetId >/dev/null; }

_gks_secrets_ok() { _gks_dbus "$1" NameHasOwner string:org.freedesktop.secrets | grep -q 'boolean true'; }

_gks_saved_addr() {
  [ -r "$_gks_env_file" ] && sed -n 's/^DBUS_SESSION_BUS_ADDRESS=//p' "$_gks_env_file"
}

_gks_fail() {
  echo "gcm-keyring-session: $*" >&2
  return 1
}

_gks_ensure() {
  if ! _gks_bus_ok "${DBUS_SESSION_BUS_ADDRESS:-}"; then
    _gks_saved=$(_gks_saved_addr)
    if _gks_bus_ok "$_gks_saved"; then
      export DBUS_SESSION_BUS_ADDRESS="$_gks_saved"
    else
      command -v dbus-launch >/dev/null 2>&1 || { _gks_fail "dbus-launch not found (apt install dbus-x11)"; return 1; }
      _gks_out=$(dbus-launch --sh-syntax) || { _gks_fail "dbus-launch failed"; return 1; }
      eval "$_gks_out"
      mkdir -p "$(dirname "$_gks_env_file")"
      (umask 077 && printf 'DBUS_SESSION_BUS_ADDRESS=%s\nDBUS_SESSION_BUS_PID=%s\n' \
        "$DBUS_SESSION_BUS_ADDRESS" "${DBUS_SESSION_BUS_PID:-}" >"$_gks_env_file")
    fi
  fi

  _gks_secrets_ok "$DBUS_SESSION_BUS_ADDRESS" && return 0

  command -v gnome-keyring-daemon >/dev/null 2>&1 ||
    { _gks_fail "gnome-keyring-daemon not found (apt install gnome-keyring)"; return 1; }
  _gks_out=$(gnome-keyring-daemon --start --components=secrets 2>/dev/null) ||
    { _gks_fail "gnome-keyring-daemon failed to start"; return 1; }
  while IFS= read -r _gks_line; do
    case $_gks_line in *=*) export "$_gks_line" ;; esac
  done <<EOF
$_gks_out
EOF
  _gks_secrets_ok "$DBUS_SESSION_BUS_ADDRESS" || { _gks_fail "Secret Service still not on the bus"; return 1; }
}

_gks_check() {
  _gks_rc=1
  for _gks_src in environment saved; do
    if [ "$_gks_src" = environment ]; then _gks_a=${DBUS_SESSION_BUS_ADDRESS:-}; else _gks_a=$(_gks_saved_addr); fi
    if [ -z "$_gks_a" ]; then
      echo "$_gks_src bus: none"
    elif ! _gks_bus_ok "$_gks_a"; then
      echo "$_gks_src bus: not reachable"
    elif _gks_secrets_ok "$_gks_a"; then
      echo "$_gks_src bus: reachable, Secret Service available"
      _gks_rc=0
    else
      echo "$_gks_src bus: reachable, Secret Service not available"
    fi
  done
  echo "saved session file: $_gks_env_file"
  return "$_gks_rc"
}

_gks_cleanup() {
  unset -f _gks_dbus _gks_bus_ok _gks_secrets_ok _gks_saved_addr _gks_fail _gks_ensure _gks_check _gks_cleanup
  unset _gks_env_file _gks_sourced _gks_addr _gks_method _gks_saved _gks_out _gks_line _gks_rc _gks_src _gks_a
}

if [ "$_gks_sourced" = 1 ]; then
  if _gks_ensure; then
    _gks_cleanup
    return 0
  fi
  _gks_cleanup
  return 1
fi

case ${1:-} in
  --check)
    _gks_check
    exit $?
    ;;
  *)
    echo "usage: . $0          (source it from your shell rc)" >&2
    echo "       $0 --check    (report the session state)" >&2
    exit 2
    ;;
esac
