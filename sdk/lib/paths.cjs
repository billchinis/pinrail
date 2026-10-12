// Where the package's files are.
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");

/** The package's root, from any file under it. */
function packageRoot(file) {
  let dir = path.dirname(file);
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const up = path.dirname(dir);
    if (up === dir) throw new Error(`no package.json above ${file}`);
    dir = up;
  }
  return dir;
}

/**
 * What the app serves at `/sdk/v1/markdown.js`: the browser build of
 * markdown-it, then the SDK's configuration of it in `src/markdown.js`, in a
 * scope of their own so the parser leaves no global behind. Built the same
 * way for the app, the harness, the development shell and the package, so a
 * view runs against one file wherever it runs.
 *
 * `from` is the package whose `node_modules` holds the parser; `src` the SDK
 * sources, which in a checkout of the app are not beneath it.
 */
function markdownScript(from, src = path.join(from, "src")) {
  const file = createRequire(path.join(from, "package.json")).resolve("markdown-it/browser");
  // the parser's build names a source map that nothing serves; a browser's
  // devtools would ask for it, and log the 404, on every view
  const parser = fs.readFileSync(file, "utf8").replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, "\n");
  return [
    "(function () {",
    "var module = { exports: {} }, exports = module.exports;",
    parser,
    "var markdownit = module.exports;",
    fs.readFileSync(path.join(src, "markdown.js"), "utf8"),
    "})();",
    "",
  ].join("\n");
}

/** The languages served beside highlight.js's common ones, which leave out
 *  some that agents often work in. Each adds a few kilobytes. */
const EXTRA_LANGUAGES = [
  "clojure",
  "cmake",
  "dart",
  "dockerfile",
  "elixir",
  "elm",
  "erlang",
  "fsharp",
  "groovy",
  "haskell",
  "julia",
  "latex",
  "nginx",
  "nix",
  "ocaml",
  "powershell",
  "properties",
  "protobuf",
  "scala",
];

/**
 * What the app serves at `/sdk/v1/highlight.js`: highlight.js's browser
 * build with its common languages, the extra languages above, then the
 * SDK's use of it in `src/highlight.js`, in a scope of their own so the
 * highlighter leaves no global behind. Built the same way for the app, the
 * harness, the development shell and the package, as `markdownScript` is.
 */
function highlightScript(from, src = path.join(from, "src")) {
  const resolve = createRequire(path.join(from, "package.json")).resolve;
  const dir = path.dirname(resolve("@highlightjs/cdn-assets/package.json"));
  const read = (file) => fs.readFileSync(path.join(dir, file), "utf8");
  return [
    "(function () {",
    "var module = undefined, exports = undefined;",
    read("highlight.min.js"),
    ...EXTRA_LANGUAGES.map((name) => read(path.join("languages", `${name}.min.js`))),
    fs.readFileSync(path.join(src, "highlight.js"), "utf8"),
    "})();",
    "",
  ].join("\n");
}

module.exports = { packageRoot, markdownScript, highlightScript };
