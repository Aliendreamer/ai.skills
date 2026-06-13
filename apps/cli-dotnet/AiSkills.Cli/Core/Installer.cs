using System.Formats.Tar;
using System.IO.Compression;

namespace AiSkills.Cli.Core;

public static class Installer
{
    public static string TarballUrl(string owner, string repo, string @ref) =>
        $"https://codeload.github.com/{owner}/{repo}/tar.gz/{@ref}";

    /// <summary>
    /// Extract only <paramref name="subpath"/> from a GitHub source tarball into
    /// <paramref name="destDir"/>, stripping the <c>topDir/subpath/</c> prefix.
    /// </summary>
    public static async Task ExtractSubpathAsync(string tarballPath, string topDir, string subpath, string destDir)
    {
        var prefix = $"{topDir}/{subpath}/";
        Directory.CreateDirectory(destDir);
        var destRoot = Path.GetFullPath(destDir + Path.DirectorySeparatorChar);

        await using var fs = File.OpenRead(tarballPath);
        await using var gz = new GZipStream(fs, CompressionMode.Decompress);
        await using var reader = new TarReader(gz);

        while (await reader.GetNextEntryAsync() is { } entry)
        {
            // Only extract regular files; symlinks/hardlinks are skipped (Tar Slip defense).
            if (entry.EntryType is not (TarEntryType.RegularFile or TarEntryType.V7RegularFile))
            {
                continue;
            }

            if (!entry.Name.StartsWith(prefix, StringComparison.Ordinal))
            {
                continue;
            }

            var relative = entry.Name[prefix.Length..];
            if (relative.Length == 0 || Path.IsPathRooted(relative) ||
                relative.Split('/').Any(segment => segment == ".."))
            {
                throw new IOException($"Refusing to extract unsafe tar entry: {entry.Name}");
            }

            var outPath = Path.GetFullPath(
                Path.Combine(destDir, relative.Replace('/', Path.DirectorySeparatorChar)));
            if (!outPath.StartsWith(destRoot, StringComparison.Ordinal))
            {
                throw new IOException($"Refusing to extract outside destination: {entry.Name}");
            }

            Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
            await entry.ExtractToFileAsync(outPath, overwrite: true);
        }
    }

    /// <summary>Install a fetched skill: folder copy, or a single .mdc for cursor.</summary>
    public static Task<string> InstallSkillAsync(string sourceDir, string agent, Scope scope, string id, Bases bases)
    {
        var dest = Adapters.ResolveSkillDestination(agent, scope, id, bases);

        if (Adapters.IsSingleFile(agent))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
            File.Copy(Path.Combine(sourceDir, "SKILL.md"), dest, overwrite: true);
        }
        else
        {
            CopyDirectory(sourceDir, dest);
        }

        return Task.FromResult(dest);
    }

    private static void CopyDirectory(string source, string dest)
    {
        Directory.CreateDirectory(dest);
        foreach (var file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(source, file);
            var outPath = Path.Combine(dest, relative);
            Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
            File.Copy(file, outPath, overwrite: true);
        }
    }
}
