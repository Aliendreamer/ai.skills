using AiSkills.Cli.Core;
using Xunit;

namespace AiSkills.Cli.Tests;

public class AddServiceTests
{
    private static Catalog Sample() => new(new List<CatalogEntry>
    {
        new("a-skill", "skill", "d", Array.Empty<string>(), new[] { "claude" }, "0.1.0", "skills/a-skill"),
        new("b-prompt", "prompt", "d", Array.Empty<string>(), new[] { "claude" }, "0.1.0", "prompts/b-prompt", "x"),
    });

    [Fact]
    public void ResolveTargets_KnownIds()
    {
        var t = AddService.ResolveTargets(Sample(), new[] { "a-skill" });
        Assert.Single(t);
        Assert.Equal("a-skill", t[0].Id);
    }

    [Fact]
    public void ResolveTargets_UnknownIdThrows()
    {
        var ex = Assert.ThrowsAny<Exception>(() => AddService.ResolveTargets(Sample(), new[] { "nope" }));
        Assert.Contains("nope", ex.Message);
    }

    [Fact]
    public void ResolveTargets_AllAndEmpty()
    {
        Assert.Equal(2, AddService.ResolveTargets(Sample(), Array.Empty<string>(), all: true).Count);
        Assert.ThrowsAny<Exception>(() => AddService.ResolveTargets(Sample(), Array.Empty<string>()));
    }

    [Fact]
    public void Options_ScopeAndYes()
    {
        Assert.Equal(Scope.Project, Options.ResolveScope(false, false));
        Assert.Equal(Scope.Global, Options.ResolveScope(false, true));
        Assert.ThrowsAny<Exception>(() => Options.ResolveScope(true, true));
        Assert.ThrowsAny<Exception>(() => Options.RequireYesFlags(null, yes: true));
        Options.RequireYesFlags("claude", yes: true); // no throw
    }

    private sealed class FakeFetcher : IItemFetcher
    {
        public List<string> Fetched { get; } = new();
        public Task FetchAsync(string owner, string repo, string @ref, string subpath, string destDir)
        {
            Fetched.Add(subpath);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeSkillInstaller : ISkillInstaller
    {
        public List<string> Installed { get; } = new();
        public Task<string> InstallAsync(string sourceDir, string agent, Scope scope, string id, Bases bases)
        {
            Installed.Add(id);
            return Task.FromResult($"/dest/{id}");
        }
    }

    private sealed class FakePromptInstaller : IPromptInstaller
    {
        public List<string> Installed { get; } = new();
        public Task<string> InstallAsync(string sourceDir, string agent, Scope scope, string id, string description, Bases bases)
        {
            Installed.Add(id);
            return Task.FromResult($"/dest/{id}");
        }
    }

    private sealed class ThrowingSkillInstaller : ISkillInstaller
    {
        public Task<string> InstallAsync(string sourceDir, string agent, Scope scope, string id, Bases bases) =>
            throw new InvalidOperationException("boom");
    }

    [Fact]
    public async Task AddItems_InstallsSkillsAndPrompts()
    {
        var skill = new FakeSkillInstaller();
        var prompt = new FakePromptInstaller();
        var results = await AddService.AddItemsAsync(
            AddService.ResolveTargets(Sample(), Array.Empty<string>(), all: true),
            new RepoRef("o", "r", "main"), "claude", Scope.Project, new Bases("/p", "/h"),
            new FakeFetcher(), skill, prompt, () => "/tmp/x");

        Assert.Collection(results,
            r => { Assert.Equal("a-skill", r.Id); Assert.Equal("installed", r.Status); },
            r => { Assert.Equal("b-prompt", r.Id); Assert.Equal("installed", r.Status); });
        Assert.Contains("a-skill", skill.Installed);
        Assert.Contains("b-prompt", prompt.Installed);
    }

    [Fact]
    public async Task AddItems_ReportsPerItemFailure()
    {
        var results = await AddService.AddItemsAsync(
            AddService.ResolveTargets(Sample(), Array.Empty<string>(), all: true),
            new RepoRef("o", "r", "main"), "claude", Scope.Project, new Bases("/p", "/h"),
            new FakeFetcher(), new ThrowingSkillInstaller(), new FakePromptInstaller(), () => "/tmp/x");

        Assert.Equal("failed", results[0].Status);
        Assert.Contains("boom", results[0].Message);
        Assert.Equal("installed", results[1].Status);
    }
}
