## ADDED Requirements

### Requirement: Available as a .NET global tool
The CLI SHALL also be distributed as a .NET global tool that exposes the `ai-skills` command and
implements the same `list`/`search`/`info`/`add` behavior and flags as the npx implementation.
The tool project SHALL set `PackAsTool` and a `ToolCommandName` of `ai-skills`.

#### Scenario: Packaged as a dotnet tool
- **WHEN** the dotnet project is packed
- **THEN** it produces a tool package whose command is `ai-skills`

#### Scenario: Same command surface
- **WHEN** the dotnet tool is run with `--help`
- **THEN** it lists `list`, `search`, `info`, and `add` with the same flags as the npx CLI

#### Scenario: Behavioral parity for add
- **WHEN** `add my-skill --agent claude --project --yes` runs against the same catalog
- **THEN** the dotnet tool installs the skill to the same destination the npx CLI would use, and
  defers prompt-type entries the same way
