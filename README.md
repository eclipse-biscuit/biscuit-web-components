# `biscuit-web-components`

This repo is part of the [eclipse biscuit](https://github.com/biscuit-auth/biscuit) project.

Biscuit web components are tools used to provide in-browser biscuit tooling.
See [documentation](https://doc.biscuitsec.org/usage/web-components.html)

## Building

The components rely on a wasm support library, written in Rust, in `wasm/`. Building it requires a rust toolchain with the `wasm32-unknown-unknown` target, and [`wasm-pack`](https://github.com/drager/wasm-pack).

```
npm run build:wasm # builds the wasm support library in src/biscuit-wasm
npm run build      # builds the wasm support library and the components in dist/
```

The wasm support library is bundled in the npm package, `@biscuit-auth/biscuit-wasm-support` is not needed anymore.

## Bundling

The components load their wasm files (`web-tree-sitter.wasm`, `tree-sitter-biscuit.wasm` and `biscuit_bg.wasm`) relative to their own modules, with `new URL("…", import.meta.url)`. When bundling them, use a bundler that handles this pattern (Vite, webpack 5, Parcel), or a plugin: with rollup, [`@web/rollup-plugin-import-meta-assets`](https://www.npmjs.com/package/@web/rollup-plugin-import-meta-assets) (see `demo-rollup/rollup.config.js`).

## Updating `tree-sitter-biscuit`

Generate the `.wasm` file from the `tree-sitter-biscuit` repo, and update it here. Make sure it is
compatible with the version of `web-tree-sitter` that is in this repo.
