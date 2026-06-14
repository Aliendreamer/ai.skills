namespace AiSkills.Cli.Core;

public enum Scope
{
    Project,
    Global,
}

public record Bases(string Project, string Home);

public static class Adapters
{
    private static readonly HashSet<string> SingleFileAgents = new() { "cursor" };

    public static bool IsSingleFile(string agent) => SingleFileAgents.Contains(agent);

    /// <summary>Resolve the on-disk destination for a skill, or throw if unsupported.</summary>
    public static string ResolveSkillDestination(string agent, Scope scope, string id, Bases bases)
    {
        var baseDir = scope == Scope.Project ? bases.Project : bases.Home;

        return agent switch
        {
            "claude" => Path.Combine(baseDir, ".claude", "skills", id),
            "codex" => Path.Combine(baseDir, ".agents", "skills", id),
            "copilot" => scope == Scope.Project
                ? Path.Combine(bases.Project, ".github", "skills", id)
                : Path.Combine(bases.Home, ".copilot", "skills", id),
            "cursor" => scope == Scope.Project
                ? Path.Combine(bases.Project, ".cursor", "rules", $"{id}.mdc")
                : throw new ArgumentException("Agent \"cursor\" supports project scope only"),
            _ => throw new ArgumentException($"Agent \"{agent}\" does not support skills"),
        };
    }


    /// <summary>Resolve the destination for a prompt, or throw if unsupported.</summary>
    public static string ResolvePromptDestination(string agent, Scope scope, string id, Bases bases)
    {
        var baseDir = scope == Scope.Project ? bases.Project : bases.Home;

        return agent switch
        {
            "claude" => Path.Combine(baseDir, ".claude", "commands", $"{id}.md"),
            "codex" => scope == Scope.Global
                ? Path.Combine(bases.Home, ".codex", "prompts", $"{id}.md")
                : throw new ArgumentException("Agent \"codex\" supports global scope only for prompts"),
            "cursor" => Path.Combine(baseDir, ".cursor", "commands", $"{id}.md"),
            "copilot" => scope == Scope.Project
                ? Path.Combine(bases.Project, ".github", "prompts", $"{id}.prompt.md")
                : Path.Combine(bases.Home, ".copilot", "prompts", $"{id}.prompt.md"),
            "gemini" => Path.Combine(baseDir, ".gemini", "commands", $"{id}.toml"),
            _ => throw new ArgumentException($"Agent \"{agent}\" does not support prompts"),
        };
    }

    /// <summary>The render format for an agent's prompts: "md", "copilot", or "toml".</summary>
    public static string PromptFormat(string agent) => agent switch
    {
        "claude" or "codex" or "cursor" => "md",
        "copilot" => "copilot",
        "gemini" => "toml",
        _ => throw new ArgumentException($"Agent \"{agent}\" does not support prompts"),
    };
}
