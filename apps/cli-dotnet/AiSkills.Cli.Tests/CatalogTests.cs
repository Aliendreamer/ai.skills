using AiSkills.Cli.Core;
using Xunit;

namespace AiSkills.Cli.Tests;

public class CatalogTests
{
    private const string ValidJson = """
    {
      "entries": [
        { "id": "a-skill", "type": "skill", "description": "d", "tags": ["git"],
          "agents": ["claude"], "version": "0.1.0", "path": "skills/a-skill" },
        { "id": "b-prompt", "type": "prompt", "description": "d", "tags": [],
          "agents": ["codex"], "version": "0.1.0", "appPattern": "x", "path": "prompts/b-prompt" }
      ]
    }
    """;

    [Fact]
    public void Parse_ReturnsEntries_ForValidJson()
    {
        var catalog = CatalogParser.Parse(ValidJson);
        Assert.Equal(2, catalog.Entries.Count);
        Assert.Equal("a-skill", catalog.Entries[0].Id);
        Assert.Equal("skill", catalog.Entries[0].Type);
        Assert.Equal("x", catalog.Entries[1].AppPattern);
        Assert.Null(catalog.Entries[0].AppPattern);
    }

    [Fact]
    public void Parse_Throws_WhenEntriesMissing()
    {
        Assert.ThrowsAny<Exception>(() => CatalogParser.Parse("{}"));
    }

    [Fact]
    public void Parse_Throws_WhenEntryInvalid()
    {
        Assert.ThrowsAny<Exception>(() => CatalogParser.Parse("""{ "entries": [ { "id": "x" } ] }"""));
    }
}
