namespace AiSkills.Cli.Core;

public record AddResult(string Id, string Status, string? Dest = null);

public interface IItemFetcher
{
    Task FetchAsync(string owner, string repo, string @ref, string subpath, string destDir);
}

public interface ISkillInstaller
{
    Task<string> InstallAsync(string sourceDir, string agent, Scope scope, string id, Bases bases);
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

    public static void RequireYesFlags(string? agent, bool yes)
    {
        if (yes && string.IsNullOrEmpty(agent))
        {
            throw new ArgumentException("--agent is required with --yes");
        }
    }
}

public static class AddService
{
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

    public static async Task<IReadOnlyList<AddResult>> AddSkillsAsync(
        IReadOnlyList<CatalogEntry> targets,
        RepoRef repo,
        string agent,
        Scope scope,
        Bases bases,
        IItemFetcher fetcher,
        ISkillInstaller installer,
        Func<string> makeTmp)
    {
        var results = new List<AddResult>();
        foreach (var entry in targets)
        {
            if (entry.Type != "skill")
            {
                results.Add(new AddResult(entry.Id, "deferred"));
                continue;
            }

            var tmp = makeTmp();
            await fetcher.FetchAsync(repo.Owner, repo.Repo, repo.Ref, entry.Path, tmp);
            var dest = await installer.InstallAsync(tmp, agent, scope, entry.Id, bases);
            results.Add(new AddResult(entry.Id, "installed", dest));
        }

        return results;
    }
}
