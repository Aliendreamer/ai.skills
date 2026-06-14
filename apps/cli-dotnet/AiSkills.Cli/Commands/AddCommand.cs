using AiSkills.Cli.Core;
using AiSkills.Cli.Infra;
using Spectre.Console;
using Spectre.Console.Cli;

namespace AiSkills.Cli.Commands;

public sealed class AddCommand : AsyncCommand<AddSettings>
{
    protected override async Task<int> ExecuteAsync(CommandContext context, AddSettings settings, CancellationToken cancellationToken)
    {
        var flagAgents = AddService.ResolveAgents(settings.Agent, settings.AllAgents);
        Options.RequireYesFlags(flagAgents, settings.Yes);
        if (settings.Yes && !settings.All && settings.Ids.Length == 0)
        {
            throw new ArgumentException("With --yes, specify item id(s) or --all");
        }

        using var http = new HttpClient();
        var repo = settings.Resolve();
        var catalog = await CatalogClient.FetchAsync(http, repo);

        IReadOnlyList<CatalogEntry> targets;
        if (settings.All)
        {
            targets = AddService.ResolveTargets(catalog, Array.Empty<string>(), all: true);
        }
        else if (settings.Ids.Length > 0)
        {
            targets = AddService.ResolveTargets(catalog, settings.Ids);
        }
        else
        {
            var type = AnsiConsole.Prompt(
                new SelectionPrompt<string>()
                    .Title("What to install?")
                    .AddChoices("Skills", "Prompts", "Everything"));
            var pool = type switch
            {
                "Skills" => catalog.Entries.Where(e => e.Type == "skill"),
                "Prompts" => catalog.Entries.Where(e => e.Type == "prompt"),
                _ => catalog.Entries,
            };
            var chosen = AnsiConsole.Prompt(
                new MultiSelectionPrompt<string>()
                    .Title("Select items to add")
                    .NotRequired()
                    .AddChoices(pool.Select(e => e.Id)));
            targets = AddService.ResolveTargets(catalog, chosen);
        }

        var agents = flagAgents;
        if (agents.Count == 0)
        {
            agents = AnsiConsole.Prompt(
                new MultiSelectionPrompt<string>()
                    .Title("Select agents")
                    .AddChoices(AddService.Agents));
            if (agents.Count == 0)
            {
                throw new ArgumentException("No agents selected");
            }
        }

        Scope scope;
        if (settings.Project || settings.Global)
        {
            scope = Options.ResolveScope(settings.Project, settings.Global);
        }
        else if (settings.Yes)
        {
            scope = Scope.Project;
        }
        else
        {
            scope = AnsiConsole.Prompt(
                new SelectionPrompt<Scope>()
                    .Title("Install scope")
                    .UseConverter(s => s == Scope.Project ? "Project (./)" : "Global (~/)")
                    .AddChoices(Scope.Project, Scope.Global));
        }

        var bases = new Bases(Directory.GetCurrentDirectory(),
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile));

        var results = await AddService.AddItemsAsync(
            targets, repo, agents, scope, bases,
            new HttpItemFetcher(http), new FileSkillInstaller(), new FilePromptInstaller(),
            () => Directory.CreateTempSubdirectory("ai-skills-add-").FullName);

        foreach (var r in results)
        {
            if (r.Status == "installed")
            {
                AnsiConsole.MarkupLineInterpolated($"[green]✓ {r.Id} → {r.Agent} ({r.Dest})[/]");
            }
            else
            {
                AnsiConsole.MarkupLineInterpolated($"[red]✗ {r.Id} → {r.Agent}: {r.Message}[/]");
            }
        }

        return 0;
    }
}
