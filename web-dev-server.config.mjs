import { esbuildPlugin } from "@web/dev-server-esbuild";

// web-tree-sitter dynamically imports node built-ins in node-only code paths.
// Bundlers skip them thanks to the package's `browser` field, but wds does
// not, so leave them unresolved: they are never reached in the browser.
const nodeOnlyImports = ["fs/promises", "module"];

export default {
  plugins: [
    esbuildPlugin({ ts: true }),
    {
      name: "ignore-node-only-imports",
      resolveImport({ source }) {
        if (nodeOnlyImports.includes(source)) return source;
      },
    },
  ],
};
