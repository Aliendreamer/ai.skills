using AiSkills.Cli.Commands;
using Spectre.Console;
using Spectre.Console.Cli;

var app = new CommandApp();
app.Configure(config =>
{
    config.SetApplicationName("ai-skills");
    config.AddCommand<ListCommand>("list").WithDescription("List items in the store");
    config.AddCommand<SearchCommand>("search").WithDescription("Search items by id, description, or tag");
    config.AddCommand<InfoCommand>("info").WithDescription("Show details for one item");
    config.AddCommand<AddCommand>("add").WithDescription("Install skill(s) into an agent");

#if DEBUG
    config.PropagateExceptions();
#endif
});

try
{
    return await app.RunAsync(args);
}
catch (Exception ex)
{
    AnsiConsole.MarkupLineInterpolated($"[red]{ex.Message}[/]");
    return 1;
}
