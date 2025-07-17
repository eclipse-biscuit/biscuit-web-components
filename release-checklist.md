# Release checklist

biscuit-web-components is part of the [Eclipse Biscuit](https://projects.eclipse.org/projects/technology.biscuit) project and as such needs to conform the eclipse project management guidelines.

Eclipse projects can only be released within the validity period of a release review (they last for 1 year).

## Pre-release

- make sure `README.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` are present and up-to-date
- make sure `LICENSE` is present and that all source files are properly annotated with copyright and license information
- make sure dependency license information is correctly vetted:

```bash
java -jar org.eclipse.dash.licenses-1.1.0.jar package-lock.json
```

(you’ll need to download the [eclipse dash licenses jar](repo.eclipse.org/content/repositories/dash-licenses/org/eclipse/dash/org.eclipse.dash.licenses/))

This step should be automated at some point.

## Requesting a release review

If the most recent release review is outdated, we will need to start a new one on the [project governance page](https://projects.eclipse.org/projects/technology.biscuit/governance).

## Sync’d releases

Since the release review process is time-consuming and introduces latency, we should try to bundle release reviews in a single one.

We can assume that the following lifecycles are coupled:

- [biscuit-parser](https://eclipse-biscuit/biscuit-rust)
- [biscuit-quote](https://eclipse-biscuit/biscuit-rust)
- [biscuit-auth](https://eclipse-biscuit/biscuit-rust)
- [biscuit-capi](https://eclipse-biscuit/biscuit-rust)
- [biscuit-cli](https://github.com/eclipse-biscuit/biscuit-cli)
- [biscuit-component-wasm](https://github.com/eclipse-biscuit/biscuit-component-wasm)
- biscuit-web-components (this repo)
