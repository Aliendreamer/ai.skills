using System.Text.RegularExpressions;

namespace AiSkills.Cli.Core;

public static partial class PromptRenderer
{
    [GeneratedRegex(@"^---\n[\s\S]*?\n---\n?")]
    private static partial Regex FrontmatterRegex();

    /// <summary>Drop a leading <c>---</c> frontmatter block, returning the body.</summary>
    public static string StripFrontmatter(string content)
    {
        if (!content.StartsWith("---", StringComparison.Ordinal))
        {
            return content;
        }

        var match = FrontmatterRegex().Match(content);
        return match.Success ? content[match.Length..].TrimStart('\n') : content;
    }

    /// <summary>Render a prompt body + description into an agent's native format.</summary>
    public static string Render(string format, string description, string body)
    {
        var withNewline = body.EndsWith('\n') ? body : body + '\n';
        return format switch
        {
            "md" => withNewline,
            "copilot" => $"---\ndescription: {description}\n---\n\n{withNewline}",
            "toml" => $"description = \"{EscapeToml(description)}\"\nprompt = \"\"\"\n{body.TrimEnd('\n')}\n\"\"\"\n",
            _ => throw new ArgumentException($"Unknown prompt format \"{format}\""),
        };
    }

    private static string EscapeToml(string value) =>
        value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal);
}
