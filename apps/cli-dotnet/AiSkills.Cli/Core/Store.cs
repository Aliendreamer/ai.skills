namespace AiSkills.Cli.Core;

public record RepoRef(string Owner, string Repo, string Ref);

public static class Store
{
    private const string DefaultOwner = "Aliendreamer";
    private const string DefaultRepo = "ai.skills";
    private const string DefaultRef = "main";

    public static RepoRef ResolveRepo(string? repo, string? @ref, IDictionary<string, string?>? env = null)
    {
        env ??= new Dictionary<string, string?>();

        var owner = DefaultOwner;
        var name = DefaultRepo;

        var spec = repo ?? Get(env, "AI_SKILLS_REPO");
        if (!string.IsNullOrEmpty(spec))
        {
            var parts = spec.Split('/');
            if (parts.Length != 2 || parts[0].Length == 0 || parts[1].Length == 0)
            {
                throw new ArgumentException($"Invalid repo \"{spec}\"; expected owner/repo");
            }

            owner = parts[0];
            name = parts[1];
        }

        var resolvedRef = @ref ?? Get(env, "AI_SKILLS_REF") ?? DefaultRef;
        return new RepoRef(owner, name, resolvedRef);
    }

    public static string CatalogRawUrl(string owner, string repo, string @ref) =>
        $"https://raw.githubusercontent.com/{owner}/{repo}/{@ref}/catalog.json";

    private static string? Get(IDictionary<string, string?> env, string key) =>
        env.TryGetValue(key, out var value) ? value : null;
}
