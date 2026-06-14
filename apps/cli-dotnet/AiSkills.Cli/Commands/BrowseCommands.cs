using AiSkills.Cli.Core;
using AiSkills.Cli.Infra;
using Spectre.Console;
using Spectre.Console.Cli;

namespace AiSkills.Cli.Commands;

internal static class Render
{
    public static void Line(CatalogEntry e)
    {
        var tag = e.Type == "prompt" ? "[magenta]prompt[/]" : "[cyan]skill[/]";
        // Compose markup with escaped dynamic parts; MarkupLineInterpolated would escape the tag too.
        AnsiConsole.MarkupLine($"[bold]{Markup.Escape(e.Id)}[/]  {tag}  [dim]{Markup.Escape(e.Description)}[/]");
    }
}

public sealed class ListCommand : AsyncCommand<ListSettings>
{
    protected override async Task<int> ExecuteAsync(CommandContext context, ListSettings settings, CancellationToken cancellationToken)
    {
        using var http = new HttpClient();
        var catalog = await CatalogClient.FetchAsync(http, settings.Resolve());
        var rows = Browse.Filter(catalog, settings.Type, settings.Agent);
        if (rows.Count == 0)
        {
            AnsiConsole.WriteLine("No matching items.");
            return 0;
        }

        foreach (var e in rows)
        {
            Render.Line(e);
        }

        return 0;
    }
}

public sealed class SearchCommand : AsyncCommand<SearchSettings>
{
    protected override async Task<int> ExecuteAsync(CommandContext context, SearchSettings settings, CancellationToken cancellationToken)
    {
        using var http = new HttpClient();
        var catalog = await CatalogClient.FetchAsync(http, settings.Resolve());
        var rows = Browse.Filter(catalog, query: settings.Query);
        if (rows.Count == 0)
        {
            AnsiConsole.WriteLine($"No items match \"{settings.Query}\".");
            return 0;
        }

        foreach (var e in rows)
        {
            Render.Line(e);
        }

        return 0;
    }
}

public sealed class InfoCommand : AsyncCommand<InfoSettings>
{
    protected override async Task<int> ExecuteAsync(CommandContext context, InfoSettings settings, CancellationToken cancellationToken)
    {
        using var http = new HttpClient();
        var catalog = await CatalogClient.FetchAsync(http, settings.Resolve());
        var entry = Browse.Find(catalog, settings.Id);
        if (entry is null)
        {
            AnsiConsole.MarkupLineInterpolated($"[red]Unknown item: {settings.Id}[/]");
            return 1;
        }

        AnsiConsole.MarkupLineInterpolated($"[bold]{entry.Id}[/]");
        AnsiConsole.WriteLine($"  type:        {entry.Type}");
        AnsiConsole.WriteLine($"  description: {entry.Description}");
        AnsiConsole.WriteLine($"  tags:        {(entry.Tags.Count > 0 ? string.Join(", ", entry.Tags) : "-")}");
        AnsiConsole.WriteLine($"  agents:      {string.Join(", ", entry.Agents)}");
        AnsiConsole.WriteLine($"  version:     {entry.Version}");
        if (entry.AppPattern is not null)
        {
            AnsiConsole.WriteLine($"  appPattern:  {entry.AppPattern}");
        }

        AnsiConsole.WriteLine($"  path:        {entry.Path}");
        return 0;
    }
}
