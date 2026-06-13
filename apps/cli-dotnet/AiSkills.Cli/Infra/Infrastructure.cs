using AiSkills.Cli.Core;

namespace AiSkills.Cli.Infra;

/// <summary>Fetches the catalog.json over HTTP and parses it.</summary>
public static class CatalogClient
{
    public static async Task<Catalog> FetchAsync(HttpClient http, RepoRef repo)
    {
        var url = Store.CatalogRawUrl(repo.Owner, repo.Repo, repo.Ref);
        var json = await http.GetStringAsync(url);
        return CatalogParser.Parse(json);
    }
}

/// <summary>Downloads an item from the store tarball and extracts its subpath.</summary>
public sealed class HttpItemFetcher(HttpClient http) : IItemFetcher
{
    public async Task FetchAsync(string owner, string repo, string @ref, string subpath, string destDir)
    {
        var url = Installer.TarballUrl(owner, repo, @ref);
        using var response = await http.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var tarball = Path.Combine(Path.GetTempPath(), $"{Path.GetRandomFileName()}.tar.gz");
        try
        {
            await using (var fs = File.Create(tarball))
            {
                await response.Content.CopyToAsync(fs);
            }

            await Installer.ExtractSubpathAsync(tarball, $"{repo}-{@ref}", subpath, destDir);
        }
        finally
        {
            if (File.Exists(tarball))
            {
                File.Delete(tarball);
            }
        }
    }
}

/// <summary>Installs a skill onto disk using the shared install rules.</summary>
public sealed class FileSkillInstaller : ISkillInstaller
{
    public Task<string> InstallAsync(string sourceDir, string agent, Scope scope, string id, Bases bases) =>
        Installer.InstallSkillAsync(sourceDir, agent, scope, id, bases);
}
