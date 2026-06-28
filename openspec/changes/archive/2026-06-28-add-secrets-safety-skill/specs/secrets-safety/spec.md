## ADDED Requirements

### Requirement: Agent must never read the secrets source
An agent SHALL NOT write or execute any script or command that reads from the user's
designated secrets source (file, folder, or glob pattern such as `.env.*`). The sandbox
filesystem restriction is a structural fallback, not a behavioral license.

#### Scenario: Agent is asked to construct a curl command using a stored password
- **WHEN** a task requires a credential stored in the secrets source
- **THEN** the agent SHALL write the command with a placeholder and instruct the user to substitute the value themselves

#### Scenario: Agent is unsure which file is the secrets source
- **WHEN** the project secrets source is not explicitly stated
- **THEN** the agent SHALL ask the user before writing any command that might touch credentials

### Requirement: Agent must never echo or log secrets
An agent SHALL NOT print, log, interpolate into visible output, or assign to a shell variable
any value read from a secrets source, even if the output is later suppressed.

#### Scenario: Agent writes a debug script that reads and prints a config value
- **WHEN** an agent might write `echo "Password: $PASSWORD"` to verify a value loaded correctly
- **THEN** the agent SHALL NOT do so; it SHALL instruct the user to verify the value themselves

### Requirement: Credential-touching operations belong to the user
An agent SHALL propose the exact command needed and let the user execute it when the
operation requires a credential. The agent SHALL NOT execute credential-touching operations
on the user's behalf.

#### Scenario: Agent needs to authenticate to an API
- **WHEN** a task requires calling an authenticated endpoint
- **THEN** the agent SHALL write the full command with the credential as a placeholder and prompt the user to run it

### Requirement: Output of commands that may expose secrets must be suppressed
When a script must pass a credential provided inline by the user, the agent SHALL suppress
command output using flags such as `-s`, `-o /dev/null`, or `2>/dev/null`.

#### Scenario: Agent writes a curl command that includes a user-provided token
- **WHEN** a user provides a credential inline for a one-off command
- **THEN** the agent SHALL include `-s -o /dev/null` or equivalent to prevent the response from leaking into context
