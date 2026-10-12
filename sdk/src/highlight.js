/*
 * The syntax highlighter of the pinrail plugin SDK, protocol 1.
 *
 * Served by the app at /sdk/v1/highlight.js. A view that shows code loads it
 * with a second script tag, beside the SDK's, and then calls
 * Pinrail.highlight(code, language), Pinrail.highlightLines(code, language)
 * and Pinrail.languageOf(path):
 *
 *   <script src="/sdk/v1/pinrail-plugin.js"></script>
 *   <script src="/sdk/v1/highlight.js"></script>
 *
 * The served file is this one with highlight.js in front of it, its common
 * languages and the extra ones in lib/paths.cjs, as `hljs`. It leaves no
 * global of its own but the highlighter the SDK looks up.
 *
 * The output is escaped text in <span class="hljs-…"> elements and nothing
 * else, so a view may put it in the DOM as it is. The SDK's stylesheet
 * colours the classes in both themes. A language the highlighter does not
 * know, or none, gives the code escaped and without spans: the language is
 * never guessed, since a guess on a few lines of a diff is often wrong.
 */
/* global hljs -- the highlighter, put in front of this file when it is served */
(function (root, hljs) {
  "use strict";

  // file names and extensions highlight.js has no alias for
  const NAMES = {
    dockerfile: "dockerfile",
    containerfile: "dockerfile",
    makefile: "makefile",
    gnumakefile: "makefile",
    "cmakelists.txt": "cmake",
    gemfile: "ruby",
    rakefile: "ruby",
    "mix.lock": "elixir",
  };
  const EXTENSIONS = {
    toml: "ini",
    cfg: "ini",
    conf: "ini",
    html: "xml",
    htm: "xml",
    svg: "xml",
    vue: "xml",
    svelte: "xml",
    heex: "xml",
    eex: "xml",
    mk: "makefile",
    jsonc: "json",
    json5: "json",
    lock: null,
  };

  const escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const known = (language) => typeof language === "string" && language !== "" && !!hljs.getLanguage(language);

  function highlight(code, language) {
    const text = code == null ? "" : String(code);
    if (!known(language)) return escape(text);
    return hljs.highlight(text, { language, ignoreIllegals: true }).value;
  }

  /* The highlighted code split into lines, each one whole: a span that a
     line break cuts, such as a comment over three lines, is closed at the end
     of each line and opened again at the start of the next. */
  function highlightLines(code, language) {
    const html = highlight(code, language);
    const lines = [];
    const open = [];
    let line = "";
    const token = /<span class="[^"]*">|<\/span>|\n/g;
    let at = 0;
    for (let hit = token.exec(html); hit; hit = token.exec(html)) {
      line += html.slice(at, hit.index);
      at = hit.index + hit[0].length;
      if (hit[0] === "\n") {
        lines.push(line + "</span>".repeat(open.length));
        line = open.join("");
      } else if (hit[0] === "</span>") {
        open.pop();
        line += hit[0];
      } else {
        open.push(hit[0]);
        line += hit[0];
      }
    }
    lines.push(line + html.slice(at));
    return lines;
  }

  /* The language of a file, from its name or its extension, or null. */
  function languageOf(path) {
    const name = String(path == null ? "" : path)
      .split(/[\\/]/)
      .pop()
      .toLowerCase();
    if (Object.prototype.hasOwnProperty.call(NAMES, name)) return NAMES[name];
    if (name.startsWith("dockerfile.") || name.endsWith(".dockerfile")) return "dockerfile";
    const dot = name.lastIndexOf(".");
    if (dot <= 0) return null;
    const ext = name.slice(dot + 1);
    if (Object.prototype.hasOwnProperty.call(EXTENSIONS, ext)) return EXTENSIONS[ext];
    const found = hljs.getLanguage(ext);
    if (!found) return null;
    // the language's own name, from the one it was found by
    return hljs.listLanguages().find((l) => hljs.getLanguage(l) === found) || null;
  }

  root[Symbol.for("pinrail.highlight")] = {
    highlight,
    highlightLines,
    languageOf,
    languages: () => hljs.listLanguages(),
  };
})(typeof window !== "undefined" ? window : globalThis, hljs);
