namespace AiSkills.Cli.Core;

public static class Browse
{
    public static IReadOnlyList<CatalogEntry> Filter(
        Catalog catalog,
        string? type = null,
        string? agent = null,
        string? query = null)
    {
        IEnumerable<CatalogEntry> q = catalog.Entries;

        if (!string.IsNullOrEmpty(type))
        {
            q = q.Where(e => e.Type == type);
        }

        if (!string.IsNullOrEmpty(agent))
        {
            q = q.Where(e => e.Agents.Contains(agent));
        }

        if (!string.IsNullOrEmpty(query))
        {
            var needle = query.ToLowerInvariant();
            q = q.Where(e =>
                string.Join(' ', new[] { e.Id, e.Description }.Concat(e.Tags))
                    .ToLowerInvariant()
                    .Contains(needle));
        }

        return q.ToList();
    }

    public static CatalogEntry? Find(Catalog catalog, string id) =>
        catalog.Entries.FirstOrDefault(e => e.Id == id);
}
