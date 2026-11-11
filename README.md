# `biscuit-web-components`

This repo is part of the [eclipse biscuit](https://github.com/biscuit-auth/biscuit) project.

Biscuit web components are tools used to provide in-browser biscuit tooling.
See [documentation](https://doc.biscuitsec.org/usage/web-components.html)

## Bundling

The components load their wasm files (`web-tree-sitter.wasm`, `tree-sitter-biscuit.wasm` and `biscuit_bg.wasm`) relative to their own modules, with `new URL("…", import.meta.url)`. When bundling them, use a bundler that handles this pattern (Vite, webpack 5, Parcel), or a plugin: with rollup, [`@web/rollup-plugin-import-meta-assets`](https://www.npmjs.com/package/@web/rollup-plugin-import-meta-assets) (see `demo-rollup/rollup.config.js`).

## Updating `tree-sitter-biscuit`

Generate the `.wasm` file from the `tree-sitter-biscuit` repo, and update it here. Make sure it is
compatible with the version of `web-tree-sitter` that is in this repo.
