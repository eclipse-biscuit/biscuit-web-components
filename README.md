# `biscuit-web-components`

This repo is part of the [eclipse biscuit](https://github.com/biscuit-auth/biscuit) project.

Biscuit web components are tools used to provide in-browser biscuit tooling.
See [documentation](https://doc.biscuitsec.org/usage/web-components.html)

## How to update tree-sitter

Tree-sitter is packaged in a way that makes it difficult to load it up with `wds`, it is packaged as a CommonJS module (modifying a `module.exports` object) and as such does not play well with es modules.

The simplest solution I have found is to turn the CommonJS module into an ES module by adding the following at the end of the file:

```js
await TreeSitter.init({
  locateFile(scriptName, scriptDirectory) {
    return "/assets/tree-sitter.wasm";
  }
});
export const Parser = TreeSitter;
```

This also calls `init` once, with the proper location of the wasm file.

So to update `tree-sitter`:

- run `npm install --no-save web-tree-sitter` (check if that’s the correct version)
- `cp node_modules/web-tree-sitter/tree-sitter.wasm assets/`
- `cp node_modules/web-tree-sitter/tree-sitter-web.d.ts ./tree-sitter.d.ts`
- edit `tree-sitter.d.ts`
  - remove the `declare module` scope
  - remove the `export = Parser`
  - add `export ` in front of `class Parser`
  - add `export ` in front of `namespace Parser`
- `cp node_modules/web-tree-sitter/tree-sitter.js ./`
- ```bash
cat << 'EOF' >> tree-sitter.js
await TreeSitter.init({
  locateFile(scriptName, scriptDirectory) {
    return "/assets/tree-sitter.wasm";
  }
});
export const Parser = TreeSitter;
EOF
```
