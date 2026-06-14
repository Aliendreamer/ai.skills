using AiSkills.Cli.Core;
using Xunit;

namespace AiSkills.Cli.Tests;

public class PromptTests
{
    private static readonly Bases Bases = new("/repo", "/home/u");

    [Fact]
    public void ResolvePromptDestination_AllAgents()
    {
        Assert.Equal(Path.Combine("/repo", ".claude", "commands", "p.md"),
            Adapters.ResolvePromptDestination("claude", Scope.Project, "p", Bases));
        Assert.Equal(Path.Combine("/repo", ".cursor", "commands", "p.md"),
            Adapters.ResolvePromptDestination("cursor", Scope.Project, "p", Bases));
        Assert.Equal(Path.Combine("/repo", ".github", "prompts", "p.prompt.md"),
            Adapters.ResolvePromptDestination("copilot", Scope.Project, "p", Bases));
        Assert.Equal(Path.Combine("/home/u", ".copilot", "prompts", "p.prompt.md"),
            Adapters.ResolvePromptDestination("copilot", Scope.Global, "p", Bases));
        Assert.Equal(Path.Combine("/repo", ".gemini", "commands", "p.toml"),
            Adapters.ResolvePromptDestination("gemini", Scope.Project, "p", Bases));
        Assert.Equal(Path.Combine("/home/u", ".codex", "prompts", "p.md"),
            Adapters.ResolvePromptDestination("codex", Scope.Global, "p", Bases));
    }

    [Fact]
    public void ResolvePromptDestination_RejectsCodexProjectAndUnknown()
    {
        Assert.ThrowsAny<Exception>(() => Adapters.ResolvePromptDestination("codex", Scope.Project, "p", Bases));
        Assert.ThrowsAny<Exception>(() => Adapters.ResolvePromptDestination("foo", Scope.Project, "p", Bases));
    }

    [Fact]
    public void StripFrontmatter_RemovesLeadingBlock()
    {
        Assert.Equal("Body here\n",
            PromptRenderer.StripFrontmatter("---\nname: p\ndescription: d\n---\n\nBody here\n"));
        Assert.Equal("Just body\n", PromptRenderer.StripFrontmatter("Just body\n"));
    }

    [Fact]
    public void Render_PerFormat()
    {
        Assert.Equal("Body\n", PromptRenderer.Render("md", "desc", "Body\n"));

        var copilot = PromptRenderer.Render("copilot", "My desc", "Body\n");
        Assert.StartsWith("---\ndescription: My desc\n---\n", copilot);
        Assert.Contains("Body", copilot);

        var toml = PromptRenderer.Render("toml", "My \"q\" desc", "Body\n");
        Assert.Contains("description = \"My \\\"q\\\" desc\"", toml);
        Assert.Contains("prompt = \"\"\"", toml);
        Assert.Contains("Body", toml);
    }

    [Fact]
    public async Task InstallPrompt_GeminiTomlAndClaudeMd()
    {
        var src = Directory.CreateTempSubdirectory("prompt-src-").FullName;
        await File.WriteAllTextAsync(Path.Combine(src, "PROMPT.md"),
            "---\nname: p\ndescription: d\ntype: prompt\n---\n\nThe prompt body\n");
        var bases = new Bases(Directory.CreateTempSubdirectory("proj-").FullName,
                              Directory.CreateTempSubdirectory("home-").FullName);

        var gemini = await Installer.InstallPromptAsync(src, "gemini", Scope.Project, "p", "d", bases);
        Assert.EndsWith("p.toml", gemini);
        var tomlText = await File.ReadAllTextAsync(gemini);
        Assert.Contains("prompt = \"\"\"", tomlText);
        Assert.Contains("The prompt body", tomlText);

        var claude = await Installer.InstallPromptAsync(src, "claude", Scope.Project, "p", "d", bases);
        Assert.EndsWith(Path.Combine("commands", "p.md"), claude);
        Assert.Contains("The prompt body", await File.ReadAllTextAsync(claude));
    }
}
