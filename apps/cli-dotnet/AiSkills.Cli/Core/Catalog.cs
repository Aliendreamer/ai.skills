using System.Text.Json;

namespace AiSkills.Cli.Core;

public record CatalogEntry(
    string Id,
    string Type,
    string Description,
    IReadOnlyList<string> Tags,
    IReadOnlyList<string> Agents,
    string Version,
    string Path,
    string? AppPattern = null,
    string? Category = null);

public record Catalog(IReadOnlyList<CatalogEntry> Entries);

/// <summary>Folders under <c>skills/</c> that group skill items (mirrors the TS SKILL_CATEGORIES).</summary>
public static class SkillCategories
{
    public static readonly IReadOnlyList<string> All =
        ["workflow", "frontend", "dependencies", "quality", "agent-setup"];

    public static bool IsKnown(string name) => All.Contains(name);
}

/// <summary>Parses and structurally validates a catalog (mirrors the TS parseCatalog).</summary>
public static class CatalogParser
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public static Catalog Parse(string json)
    {
        Catalog? catalog;
        try
        {
            catalog = JsonSerializer.Deserialize<Catalog>(json, Options);
        }
        catch (JsonException e)
        {
            throw new FormatException($"Invalid catalog JSON: {e.Message}", e);
        }

        if (catalog?.Entries is null)
        {
            throw new FormatException("Invalid catalog: expected an object with an \"entries\" array");
        }

        foreach (var e in catalog.Entries)
        {
            if (string.IsNullOrEmpty(e.Id) || string.IsNullOrEmpty(e.Type) ||
                string.IsNullOrEmpty(e.Version) || string.IsNullOrEmpty(e.Path))
            {
                throw new FormatException($"Invalid catalog entry: \"{e.Id}\"");
            }
        }

        return catalog;
    }
}
