# Backend for biscuit-web-components

This repo is part of the [eclipse biscuit](https://github.com/biscuit-auth/biscuit) project.

Biscuit-web-components can't use `biscuit-wasm` directly since it only exposes helpers dedicated to biscuit creation and verification.

This library exposes helpers for biscuit inspection, inline error reporting, etc.

```
wasm-pack build --scope biscuit-auth --target web --out-dir static --out-name biscuit
```

Generate the npm package:

```
wasm-pack build --scope biscuit-auth --target web --out-dir web --out-name biscuit
cd web
npm pack
// edit package.json to add "snippets" to the "files" array
```

