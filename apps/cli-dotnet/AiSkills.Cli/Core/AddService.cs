namespace AiSkills.Cli.Core;

public record AddResult(string Id, string Agent, string Status, string? Dest = null, string? Message = null);

public interface IItemFetcher
{
    Task FetchAsync(string owner, string repo, string @ref, string subpath, string destDir);
}

public interface ISkillInstaller
{
    Task<string> InstallAsync(string sourceDir, string agent, Scope scope, string id, Bases bases);
}

public interface IPromptInstaller
{
    Task<string> InstallAsync(string sourceDir, string agent, Scope scope, string id, string description, Bases bases);
}

public static class Options
{
    public static Scope ResolveScope(bool project, bool global)
    {
        if (project && global)
        {
            throw new ArgumentException("Use only one of --project or --global");
        }

        return global ? Scope.Global : Scope.Project;
    }

    public static void RequireYesFlags(IReadOnlyList<string> agents, bool yes)
    {
        if (yes && agents.Count == 0)
        {
            throw new ArgumentException("an agent is required with --yes (use --agent or --all-agents)");
        }
    }
}

public static class AddService
{
    public static readonly string[] Agents = ["claude", "codex", "copilot", "cursor", "gemini"];

    public static IReadOnlyList<string> ResolveAgents(string? agent, bool allAgents)
    {
        if (allAgents)
        {
            return Agents.ToList();
        }

        if (string.IsNullOrWhiteSpace(agent))
        {
            return Array.Empty<string>();
        }

        var names = agent.Split(',').Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
        var unknown = names.Where(n => !Agents.Contains(n)).ToList();
        if (unknown.Count > 0)
        {
            throw new ArgumentException($"Unknown agent(s): {string.Join(", ", unknown)}");
        }

        return names.Distinct().ToList();
    }

    public static IReadOnlyList<CatalogEntry> ResolveTargets(Catalog catalog, IReadOnlyList<string> ids, bool all = false)
    {
        if (all)
        {
            return catalog.Entries.ToList();
        }

        if (ids.Count == 0)
        {
            throw new ArgumentException("No items selected to add");
        }

        var targets = new List<CatalogEntry>();
        var unknown = new List<string>();
        foreach (var id in ids)
        {
            var entry = catalog.Entries.FirstOrDefault(e => e.Id == id);
            if (entry is not null)
            {
                targets.Add(entry);
            }
            else
            {
                unknown.Add(id);
            }
        }

        if (unknown.Count > 0)
        {
            throw new ArgumentException($"Unknown item id(s): {string.Join(", ", unknown)}");
        }

        return targets;
    }

    public static async Task<IReadOnlyList<AddResult>> AddItemsAsync(
        IReadOnlyList<CatalogEntry> targets,
        RepoRef repo,
        IReadOnlyList<string> agents,
        Scope scope,
        Bases bases,
        IItemFetcher fetcher,
        ISkillInstaller skillInstaller,
        IPromptInstaller promptInstaller,
        Func<string> makeTmp)
    {
        var results = new List<AddResult>();
        foreach (var entry in targets)
        {
            string tmp;
            try
            {
                tmp = makeTmp();
                await fetcher.FetchAsync(repo.Owner, repo.Repo, repo.Ref, entry.Path, tmp);
            }
            catch (Exception ex)
            {
                foreach (var agent in agents)
                {
                    results.Add(new AddResult(entry.Id, agent, "failed", Message: ex.Message));
                }

                continue;
            }

            foreach (var agent in agents)
            {
                try
                {
                    var dest = entry.Type == "prompt"
                        ? await promptInstaller.InstallAsync(tmp, agent, scope, entry.Id, entry.Description, bases)
                        : await skillInstaller.InstallAsync(tmp, agent, scope, entry.Id, bases);
                    results.Add(new AddResult(entry.Id, agent, "installed", dest));
                }
                catch (Exception ex)
                {
                    results.Add(new AddResult(entry.Id, agent, "failed", Message: ex.Message));
                }
            }
        }

        return results;
    }
}
