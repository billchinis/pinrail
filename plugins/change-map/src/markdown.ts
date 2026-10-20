// Markdown as the SDK renders it, with its code blocks highlighted: in the
// language a block's info string names, or in a default language, such as
// the language of the file a line comment is on.

const { Pinrail } = window;

export function markdown(text: string, language?: string | null): string {
  const html = Pinrail.markdown(text);
  if (!html.includes("<pre>")) return html;
  const box = document.createElement("div");
  box.innerHTML = html;
  for (const code of box.querySelectorAll("pre > code")) {
    const named = [...code.classList].find((c) => c.startsWith("language-"))?.slice("language-".length);
    const lang = named || language;
    if (!lang) continue;
    code.innerHTML = Pinrail.highlight(code.textContent ?? "", lang);
    code.classList.add("cm-highlighted");
  }
  return box.innerHTML;
}

/** Lines of code, highlighted together in a file's language, one string per line. */
export const highlightLines = (lines: string[], path: string) =>
  Pinrail.highlightLines(lines.join("\n"), Pinrail.languageOf(path));

/** Lines without the indentation they all share. */
export function dedent(lines: string[]): string[] {
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)![0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut));
}
