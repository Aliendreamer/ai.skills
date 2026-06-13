---
name: dotnet-webapi
description: Starter prompt for scaffolding a clean ASP.NET Core minimal-API web service with tests.
type: prompt
tags: [dotnet, aspnetcore, webapi, starter]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
appPattern: dotnet-webapi
---

You are starting a new **ASP.NET Core minimal-API** web service. Build it incrementally and
keep every step green before moving on.

## Goal

Stand up a production-shaped HTTP API in .NET with a health endpoint, one real resource,
dependency injection, configuration, and tests.

## Constraints

- .NET 8+ minimal APIs (no MVC controllers unless asked).
- Endpoints grouped by feature; handlers are small and testable.
- Validation on inputs; consistent problem-details error responses.
- `appsettings.json` for config, bound to typed options.
- Tests: unit tests for handlers + integration tests via `WebApplicationFactory`.

## Build order

1. `dotnet new web` (or `webapi --use-minimal-apis`); add a `GET /health` endpoint.
2. Add a typed options class bound from configuration.
3. Add one resource (e.g. `GET/POST /todos`) backed by an injected in-memory repository.
4. Add input validation and problem-details responses.
5. Add unit tests for the handlers and an integration test for the resource.
6. Confirm `dotnet build -warnaserror`, `dotnet test`, and `dotnet format --verify-no-changes`.

Ask before adding a database, auth, or external dependencies.
