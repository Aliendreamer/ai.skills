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
}
