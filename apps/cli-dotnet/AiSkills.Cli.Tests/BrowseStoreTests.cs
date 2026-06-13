using AiSkills.Cli.Core;
using Xunit;

namespace AiSkills.Cli.Tests;

public class BrowseStoreTests
{
    private static Catalog Sample() => new(new List<CatalogEntry>
    {
        new("a-skill", "skill", "commit helper", new[] { "git" }, new[] { "claude" }, "0.1.0", "skills/a-skill"),
        new("b-prompt", "prompt", "web api starter", new[] { "dotnet" }, new[] { "codex" }, "0.1.0", "prompts/b-prompt", "dotnet-webapi"),
    });

    [Fact]
    public void Filter_ByType()
    {
        var rows = Browse.Filter(Sample(), type: "skill");
        Assert.Single(rows);
        Assert.Equal("a-skill", rows[0].Id);
    }

    [Fact]
    public void Filter_ByAgent()
    {
        var rows = Browse.Filter(Sample(), agent: "codex");
        Assert.Single(rows);
        Assert.Equal("b-prompt", rows[0].Id);
    }

    [Fact]
    public void Filter_ByQuery_MatchesIdDescriptionTags()
    {
        Assert.Equal("a-skill", Browse.Filter(Sample(), query: "git")[0].Id);
        Assert.Equal("b-prompt", Browse.Filter(Sample(), query: "web")[0].Id);
        Assert.Equal("b-prompt", Browse.Filter(Sample(), query: "b-prompt")[0].Id);
        Assert.Empty(Browse.Filter(Sample(), query: "zzz"));
    }

    [Fact]
    public void Find_ReturnsEntryOrNull()
    {
        Assert.Equal("a-skill", Browse.Find(Sample(), "a-skill")!.Id);
        Assert.Null(Browse.Find(Sample(), "nope"));
    }

    [Fact]
    public void ResolveRepo_Defaults()
    {
        var r = Store.ResolveRepo(null, null, new Dictionary<string, string?>());
        Assert.Equal(new RepoRef("Aliendreamer", "ai.skills", "main"), r);
    }

    [Fact]
    public void ResolveRepo_HonorsFlagsThenEnv()
    {
        Assert.Equal(new RepoRef("me", "fork", "dev"), Store.ResolveRepo("me/fork", "dev", new Dictionary<string, string?>()));
        Assert.Equal(new RepoRef("a", "b", "v1"),
            Store.ResolveRepo(null, null, new Dictionary<string, string?> { ["AI_SKILLS_REPO"] = "a/b", ["AI_SKILLS_REF"] = "v1" }));
    }

    [Fact]
    public void ResolveRepo_RejectsMalformedRepo()
    {
        Assert.ThrowsAny<Exception>(() => Store.ResolveRepo("bad", null, new Dictionary<string, string?>()));
    }

    [Fact]
    public void CatalogRawUrl_IsBuilt()
    {
        Assert.Equal(
            "https://raw.githubusercontent.com/Aliendreamer/ai.skills/main/catalog.json",
            Store.CatalogRawUrl("Aliendreamer", "ai.skills", "main"));
    }
}
