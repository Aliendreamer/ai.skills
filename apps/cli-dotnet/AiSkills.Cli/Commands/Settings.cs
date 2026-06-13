using System.ComponentModel;
using AiSkills.Cli.Core;
using Spectre.Console.Cli;

namespace AiSkills.Cli.Commands;

public class StoreSettings : CommandSettings
{
    [CommandOption("--repo <OWNER/REPO>")]
    [Description("Store repository (default Aliendreamer/ai.skills)")]
    public string? Repo { get; init; }

    [CommandOption("--ref <REF>")]
    [Description("Store git ref (default main)")]
    public string? Ref { get; init; }

    public RepoRef Resolve() =>
        Store.ResolveRepo(Repo, Ref, new Dictionary<string, string?>
        {
            ["AI_SKILLS_REPO"] = Environment.GetEnvironmentVariable("AI_SKILLS_REPO"),
            ["AI_SKILLS_REF"] = Environment.GetEnvironmentVariable("AI_SKILLS_REF"),
        });
}

public sealed class ListSettings : StoreSettings
{
    [CommandOption("--type <TYPE>")]
    [Description("Filter by type: skill or prompt")]
    public string? Type { get; init; }

    [CommandOption("--agent <AGENT>")]
    [Description("Filter by supported agent")]
    public string? Agent { get; init; }
}

public sealed class SearchSettings : StoreSettings
{
    [CommandArgument(0, "<QUERY>")]
    [Description("Text to search for")]
    public string Query { get; init; } = string.Empty;
}

public sealed class InfoSettings : StoreSettings
{
    [CommandArgument(0, "<ID>")]
    [Description("Item id")]
    public string Id { get; init; } = string.Empty;
}

public sealed class AddSettings : StoreSettings
{
    [CommandArgument(0, "[IDS]")]
    [Description("Item ids to add")]
    public string[] Ids { get; init; } = Array.Empty<string>();

    [CommandOption("--all")]
    [Description("Add every item")]
    public bool All { get; init; }

    [CommandOption("--agent <AGENT>")]
    [Description("Target agent: claude, codex, copilot, cursor")]
    public string? Agent { get; init; }

    [CommandOption("--project")]
    [Description("Install into the current project (./)")]
    public bool Project { get; init; }

    [CommandOption("--global")]
    [Description("Install into the home directory (~/)")]
    public bool Global { get; init; }

    [CommandOption("-y|--yes")]
    [Description("Skip prompts (requires --agent)")]
    public bool Yes { get; init; }
}
