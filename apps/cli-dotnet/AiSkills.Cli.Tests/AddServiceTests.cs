using AiSkills.Cli.Core;

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
    public void ResolveAgents_FlagsAndValidation()
    {
        Assert.Empty(AddService.ResolveAgents(null, false));
        Assert.Equal(new[] { "claude", "cursor" }, AddService.ResolveAgents("claude,cursor", false));
        Assert.Equal(new[] { "claude", "cursor" }, AddService.ResolveAgents(" claude , cursor , claude ", false));
        Assert.Equal(AddService.Agents, AddService.ResolveAgents(null, true).ToArray());
        var ex = Assert.ThrowsAny<Exception>(() => AddService.ResolveAgents("claude,bogus", false));
        Assert.Contains("bogus", ex.Message);
    }

    [Fact]
    public void Options_ScopeAndYes()
    {
        Assert.Equal(Scope.Project, Options.ResolveScope(false, false));
        Assert.Equal(Scope.Global, Options.ResolveScope(false, true));
        Assert.ThrowsAny<Exception>(() => Options.ResolveScope(true, true));
        Assert.ThrowsAny<Exception>(() => Options.RequireYesFlags(Array.Empty<string>(), yes: true));
        Options.RequireYesFlags(new[] { "claude" }, yes: true); // no throw
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
            Installed.Add($"{id}:{agent}");
            return Task.FromResult($"/dest/{agent}/{id}");
        }
    }

    private sealed class FakePromptInstaller : IPromptInstaller
    {
        public List<string> Installed { get; } = new();
        public Task<string> InstallAsync(string sourceDir, string agent, Scope scope, string id, string description, Bases bases)
        {
            Installed.Add($"{id}:{agent}");
            return Task.FromResult($"/dest/{agent}/{id}");
        }
    }

    private sealed class FailCursorSkillInstaller : ISkillInstaller
    {
        public Task<string> InstallAsync(string sourceDir, string agent, Scope scope, string id, Bases bases) =>
            agent == "cursor"
                ? throw new InvalidOperationException("boom")
                : Task.FromResult($"/dest/{agent}/{id}");
    }

    [Fact]
    public async Task AddItems_InstallsSkillsAndPrompts()
    {
        var skill = new FakeSkillInstaller();
        var prompt = new FakePromptInstaller();
        var results = await AddService.AddItemsAsync(
            AddService.ResolveTargets(Sample(), Array.Empty<string>(), all: true),
            new RepoRef("o", "r", "main"), new[] { "claude" }, Scope.Project, new Bases("/p", "/h"),
            new FakeFetcher(), skill, prompt, () => "/tmp/x");

        Assert.Collection(results,
            r => { Assert.Equal("a-skill", r.Id); Assert.Equal("claude", r.Agent); Assert.Equal("installed", r.Status); },
            r => { Assert.Equal("b-prompt", r.Id); Assert.Equal("claude", r.Agent); Assert.Equal("installed", r.Status); });
        Assert.Contains("a-skill:claude", skill.Installed);
        Assert.Contains("b-prompt:claude", prompt.Installed);
    }

    [Fact]
    public async Task AddItems_InstallsToEveryAgentFetchingOnce()
    {
        var fetcher = new FakeFetcher();
        var results = await AddService.AddItemsAsync(
            AddService.ResolveTargets(Sample(), new[] { "a-skill" }),
            new RepoRef("o", "r", "main"), new[] { "claude", "cursor" }, Scope.Project, new Bases("/p", "/h"),
            fetcher, new FakeSkillInstaller(), new FakePromptInstaller(), () => "/tmp/x");

        Assert.Single(fetcher.Fetched);
        Assert.Collection(results,
            r => { Assert.Equal("a-skill", r.Id); Assert.Equal("claude", r.Agent); Assert.Equal("installed", r.Status); },
            r => { Assert.Equal("a-skill", r.Id); Assert.Equal("cursor", r.Agent); Assert.Equal("installed", r.Status); });
    }

    [Fact]
    public async Task AddItems_ReportsPerItemPerAgentFailure()
    {
        var results = await AddService.AddItemsAsync(
            AddService.ResolveTargets(Sample(), new[] { "a-skill" }),
            new RepoRef("o", "r", "main"), new[] { "claude", "cursor" }, Scope.Project, new Bases("/p", "/h"),
            new FakeFetcher(), new FailCursorSkillInstaller(), new FakePromptInstaller(), () => "/tmp/x");

        Assert.Equal("installed", results[0].Status);
        Assert.Equal("claude", results[0].Agent);
        Assert.Equal("failed", results[1].Status);
        Assert.Equal("cursor", results[1].Agent);
        Assert.Contains("boom", results[1].Message);
    }
}
