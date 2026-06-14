import type { PromptFormat } from './adapters.js';

/** Drop a leading `---` frontmatter block, returning the body. */
export function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content;
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) return content;
  return content.slice(match[0].length).replace(/^\n+/, '');
}

function escapeToml(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Render a prompt body + description into an agent's native format. */
export function renderPrompt(format: PromptFormat, description: string, body: string): string {
  const withNewline = body.endsWith('\n') ? body : `${body}\n`;
  switch (format) {
    case 'md':
      return withNewline;
    case 'copilot':
      return `---\ndescription: ${description}\n---\n\n${withNewline}`;
    case 'toml':
      return `description = "${escapeToml(description)}"\nprompt = """\n${body.replace(/\n+$/, '')}\n"""\n`;
  }
}
