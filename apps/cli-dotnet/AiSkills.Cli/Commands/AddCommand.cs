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
        IReadOnlyList<string> agents;
        Scope scope;

        if (!settings.All && settings.Ids.Length == 0)
        {
            var picked = RunWizard(catalog, flagAgents, settings);
            if (picked is null)
            {
                AnsiConsole.MarkupLine("[grey]Cancelled — nothing installed.[/]");
                return 0;
            }

            (targets, agents, scope) = picked.Value;
        }
        else
        {
            targets = settings.All
                ? AddService.ResolveTargets(catalog, Array.Empty<string>(), all: true)
                : AddService.ResolveTargets(catalog, settings.Ids);

            agents = flagAgents;
            if (agents.Count == 0)
            {
                agents = AnsiConsole.Prompt(
                    new MultiSelectionPrompt<string>().Title("Select agents").AddChoices(AddService.Agents));
                if (agents.Count == 0)
                {
                    throw new ArgumentException("No agents selected");
                }
            }

            scope = settings.Project || settings.Global
                ? Options.ResolveScope(settings.Project, settings.Global)
                : settings.Yes
                    ? Scope.Project
                    : AnsiConsole.Prompt(new SelectionPrompt<Scope>()
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

    /// <summary>Interactive type → items → agents → scope wizard with one-step back navigation.</summary>
    private static (IReadOnlyList<CatalogEntry> Targets, IReadOnlyList<string> Agents, Scope Scope)? RunWizard(
        Catalog catalog, IReadOnlyList<string> flagAgents, AddSettings settings)
    {
        Scope? scopeFromFlags = settings.Project || settings.Global
            ? Options.ResolveScope(settings.Project, settings.Global)
            : settings.Yes ? Scope.Project : null;

        var active = new HashSet<string> { "type", "items" };
        if (flagAgents.Count == 0) active.Add("agents");
        if (scopeFromFlags is null) active.Add("scope");

        string? PrevActive(string step)
        {
            var s = AddService.WizardBack(step);
            while (s is not null && !active.Contains(s)) s = AddService.WizardBack(s);
            return s;
        }

        string? NextActive(string step)
        {
            for (var i = Array.IndexOf(AddService.WizardSteps, step) + 1; i < AddService.WizardSteps.Length; i++)
            {
                if (active.Contains(AddService.WizardSteps[i])) return AddService.WizardSteps[i];
            }

            return null;
        }

        var step = "type";
        var type = "all";
        var itemIds = new List<string>();
        var agents = flagAgents.ToList();
        Scope? scope = scopeFromFlags;

        while (true)
        {
            if (step == "type")
            {
                var ans = AnsiConsole.Prompt(new SelectionPrompt<string>()
                    .Title("What to install?")
                    .AddChoices("Skills", "Prompts", "Everything", "✕ Cancel"));
                if (ans == "✕ Cancel") return null;
                type = ans switch { "Skills" => "skill", "Prompts" => "prompt", _ => "all" };
                var n = NextActive("type");
                if (n is null) break;
                step = n;
            }
            else if (step == "items")
            {
                var pool = (type switch
                {
                    "skill" => catalog.Entries.Where(e => e.Type == "skill"),
                    "prompt" => catalog.Entries.Where(e => e.Type == "prompt"),
                    _ => catalog.Entries,
                }).ToList();
                var prompt = new MultiSelectionPrompt<string>()
                    .Title("Select items to add (submit nothing to go back)")
                    .NotRequired()
                    .PageSize(15)
                    .MoreChoicesText("(move up/down to see more)");
                foreach (var e in pool)
                {
                    var item = prompt.AddChoice(e.Id);
                    if (itemIds.Contains(e.Id)) item.Select();
                }

                var chosen = AnsiConsole.Prompt(prompt);
                if (chosen.Count == 0) { step = PrevActive("items")!; continue; }
                itemIds = chosen.ToList();
                var n = NextActive("items");
                if (n is null) break;
                step = n;
            }
            else if (step == "agents")
            {
                var prompt = new MultiSelectionPrompt<string>()
                    .Title("Select agents (submit nothing to go back)")
                    .NotRequired();
                foreach (var a in AddService.Agents)
                {
                    var item = prompt.AddChoice(a);
                    if (agents.Contains(a)) item.Select();
                }

                var chosen = AnsiConsole.Prompt(prompt);
                if (chosen.Count == 0) { step = PrevActive("agents")!; continue; }
                agents = chosen.ToList();
                var n = NextActive("agents");
                if (n is null) break;
                step = n;
            }
            else
            {
                var ans = AnsiConsole.Prompt(new SelectionPrompt<string>()
                    .Title("Install scope")
                    .AddChoices("Project (./)", "Global (~/)", "← Back"));
                if (ans == "← Back") { step = PrevActive("scope")!; continue; }
                scope = ans == "Global (~/)" ? Scope.Global : Scope.Project;
                break;
            }
        }

        return (AddService.ResolveTargets(catalog, itemIds), agents, scope ?? Scope.Project);
    }
}
