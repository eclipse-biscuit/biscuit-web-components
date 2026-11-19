# Backend for biscuit-web-components

Biscuit-web-components can't use `biscuit-wasm` directly since it only exposes helpers dedicated to biscuit creation and verification.

This library exposes helpers for biscuit inspection, inline error reporting, etc.

It is built as part of the web components package:

```
npm run build:wasm
```
