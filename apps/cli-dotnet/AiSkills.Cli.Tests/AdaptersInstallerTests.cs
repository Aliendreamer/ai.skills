using System.Formats.Tar;
using System.IO.Compression;
using AiSkills.Cli.Core;
using Xunit;

namespace AiSkills.Cli.Tests;

public class AdaptersInstallerTests
{
    private static readonly Bases Bases = new("/repo", "/home/u");

    [Fact]
    public void ResolveSkillDestination_ClaudeAndCodex()
    {
        Assert.Equal(Path.Combine("/repo", ".claude", "skills", "s"),
            Adapters.ResolveSkillDestination("claude", Scope.Project, "s", Bases));
        Assert.Equal(Path.Combine("/home/u", ".agents", "skills", "s"),
            Adapters.ResolveSkillDestination("codex", Scope.Global, "s", Bases));
    }

    [Fact]
    public void ResolveSkillDestination_CopilotAndCursor()
    {
        Assert.Equal(Path.Combine("/repo", ".github", "skills", "s"),
            Adapters.ResolveSkillDestination("copilot", Scope.Project, "s", Bases));
        Assert.Equal(Path.Combine("/home/u", ".copilot", "skills", "s"),
            Adapters.ResolveSkillDestination("copilot", Scope.Global, "s", Bases));
        Assert.Equal(Path.Combine("/repo", ".cursor", "rules", "s.mdc"),
            Adapters.ResolveSkillDestination("cursor", Scope.Project, "s", Bases));
    }

    [Fact]
    public void ResolveSkillDestination_RejectsCursorGlobalAndUnknown()
    {
        Assert.ThrowsAny<Exception>(() => Adapters.ResolveSkillDestination("cursor", Scope.Global, "s", Bases));
        Assert.ThrowsAny<Exception>(() => Adapters.ResolveSkillDestination("gemini", Scope.Project, "s", Bases));
    }

    [Fact]
    public void TarballUrl_IsBuilt()
    {
        Assert.Equal("https://codeload.github.com/Aliendreamer/ai.skills/tar.gz/main",
            Installer.TarballUrl("Aliendreamer", "ai.skills", "main"));
    }

    [Fact]
    public async Task ExtractSubpath_ExtractsOnlyRequested()
    {
        const string topDir = "ai.skills-main";
        var src = Directory.CreateTempSubdirectory("src-").FullName;
        Write(Path.Combine(src, topDir, "skills", "my-skill", "SKILL.md"), "wanted\n");
        Write(Path.Combine(src, topDir, "skills", "my-skill", "extra.txt"), "extra\n");
        Write(Path.Combine(src, topDir, "skills", "other", "SKILL.md"), "other\n");

        var tarball = Path.Combine(Directory.CreateTempSubdirectory("tar-").FullName, "a.tar.gz");
        await using (var fs = File.Create(tarball))
        await using (var gz = new GZipStream(fs, CompressionMode.Compress))
        {
            await TarFile.CreateFromDirectoryAsync(src, gz, includeBaseDirectory: false);
        }

        var dest = Directory.CreateTempSubdirectory("dest-").FullName;
        await Installer.ExtractSubpathAsync(tarball, topDir, "skills/my-skill", dest);

        Assert.Equal("wanted\n", File.ReadAllText(Path.Combine(dest, "SKILL.md")));
        Assert.True(File.Exists(Path.Combine(dest, "extra.txt")));
        Assert.False(Directory.Exists(Path.Combine(dest, "other")));
        Assert.False(Directory.Exists(Path.Combine(dest, "skills")));
    }

    [Fact]
    public async Task InstallSkill_FolderForClaude_SingleFileForCursor()
    {
        var src = Directory.CreateTempSubdirectory("skill-").FullName;
        Write(Path.Combine(src, "SKILL.md"), "body\n");
        Write(Path.Combine(src, "scripts", "run.sh"), "echo hi\n");

        var bases = new Bases(Directory.CreateTempSubdirectory("proj-").FullName,
                              Directory.CreateTempSubdirectory("home-").FullName);

        var claudeDest = await Installer.InstallSkillAsync(src, "claude", Scope.Project, "my-skill", bases);
        Assert.Equal("body\n", File.ReadAllText(Path.Combine(claudeDest, "SKILL.md")));
        Assert.True(File.Exists(Path.Combine(claudeDest, "scripts", "run.sh")));

        var cursorDest = await Installer.InstallSkillAsync(src, "cursor", Scope.Project, "my-skill", bases);
        Assert.EndsWith("my-skill.mdc", cursorDest);
        Assert.Equal("body\n", File.ReadAllText(cursorDest));
    }

    [Fact]
    public async Task ExtractSubpath_RejectsPathTraversal()
    {
        const string topDir = "ai.skills-main";
        var tarball = Path.Combine(Directory.CreateTempSubdirectory("tar-").FullName, "evil.tar.gz");
        await using (var fs = File.Create(tarball))
        await using (var gz = new GZipStream(fs, CompressionMode.Compress))
        await using (var writer = new TarWriter(gz))
        {
            var entry = new PaxTarEntry(TarEntryType.RegularFile, "ai.skills-main/skills/my-skill/../../../escape.txt")
            {
                DataStream = new MemoryStream("pwned"u8.ToArray()),
            };
            await writer.WriteEntryAsync(entry);
        }

        var dest = Directory.CreateTempSubdirectory("dest-").FullName;
        await Assert.ThrowsAnyAsync<IOException>(
            () => Installer.ExtractSubpathAsync(tarball, topDir, "skills/my-skill", dest));
        Assert.False(File.Exists(Path.Combine(dest, "..", "..", "..", "escape.txt")));
    }

    private static void Write(string path, string contents)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, contents);
    }
}
