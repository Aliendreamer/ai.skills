# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

This repository is new and currently contains **no application code, commits, or build configuration** — only tooling
scaffolding. The sections below are placeholders to be filled in as the project takes shape. When real code, build
scripts, and architecture exist, re-run `/init` (or update this file directly) to replace the placeholders.

Project name: `ai.skills`.

## Tooling present

- **Serena** (`.serena/`) — MCP-based code navigation/editing server. Project config lives in `.serena/project.yml`;
  `languages: []` is unset, so populate it once a primary language is chosen. `.serena/memories/` holds on-demand
  project memories.
- **remember** (`.remember/`) — session-state skill. Logs live under `.remember/logs/`; write session handoffs to
  `.remember/remember.md`.

Both directories are tooling artifacts, not project source.

## Commands

_None yet._ Document build, lint, test, and "run a single test" commands here once they exist.

## Architecture

_None yet._ Document the big-picture structure (the parts that require reading multiple files to understand) once code
is added.
