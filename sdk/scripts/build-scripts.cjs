// Writes dist/markdown.js and dist/highlight.js, the files the package
// exports as ./sdk/v1/markdown.js and ./sdk/v1/highlight.js. Run before the
// package is packed.
const fs = require("node:fs");
const path = require("node:path");
const { markdownScript, highlightScript } = require("../lib/paths.cjs");

const root = path.dirname(__dirname);
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist", "markdown.js"), markdownScript(root));
fs.writeFileSync(path.join(root, "dist", "highlight.js"), highlightScript(root));
