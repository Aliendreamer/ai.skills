#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { listCommand, searchCommand, infoCommand } from './commands/browse.js';
import { addCommand } from './commands/add.js';

const program = new Command();

program
  .name('ai-skills')
  .description('Install AI agent skills and prompts from the ai.skills store')
  .version('0.0.0')
  .option('--repo <owner/repo>', 'store repository (default Aliendreamer/ai.skills)')
  .option('--ref <ref>', 'store git ref (default main)');

program
  .command('list')
  .description('List items in the store')
  .option('--type <type>', 'filter by type: skill or prompt')
  .option('--agent <agent>', 'filter by supported agent')
  .action((opts, cmd) => listCommand({ ...cmd.optsWithGlobals(), ...opts }));

program
  .command('search')
  .description('Search items by id, description, or tag')
  .argument('<query>', 'text to search for')
  .action((query, opts, cmd) => searchCommand(query, cmd.optsWithGlobals()));

program
  .command('info')
  .description('Show details for one item')
  .argument('<id>', 'item id')
  .action((id, opts, cmd) => infoCommand(id, cmd.optsWithGlobals()));

program
  .command('add')
  .description('Install skill(s) into an agent (interactive when no ids are given)')
  .argument('[ids...]', 'item ids to add')
  .option('--all', 'add every item')
  .option('--agent <agents>', 'target agent(s), comma-separated: claude, codex, copilot, cursor, gemini')
  .option('--all-agents', 'install into every supported agent')
  .option('--project', 'install into the current project (./)')
  .option('--global', 'install into the home directory (~/)')
  .option('-y, --yes', 'skip prompts (requires --agent)')
  .action((ids, opts, cmd) => addCommand(ids, { ...cmd.optsWithGlobals(), ...opts }));

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(pc.red((err as Error).message));
  process.exit(1);
});
