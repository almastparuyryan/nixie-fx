# PixiJS button edge spark

This is a standalone PixiJS 8 example proposed for `examples/pixijs-button-edge-spark` in `azakhary/nixie-fx`. It adds a short fleck burst across a button edge on click. The effect is authored as JSON, exported to a runtime bundle, and loaded through the public NixieFX Pixi adapter. The button is regular HTML so keyboard activation still works and the interaction survives `prefers-reduced-motion: reduce`.

The code and effect are distinct from the repository's existing `examples/pixijs` opening-engine scene and from the generic center radial burst in the product tutorial. This demo uses a wide, shallow box emitter positioned over a UI button, square cyan flecks, a 0.42 second particle lifetime, and a one-shot click trigger. It does not claim that NixieFX implements the button, accessibility semantics, or responsive layout; those are host app responsibilities.

## Run and verify

Requires Node.js 20.19 or newer for the pinned Vite version.

```sh
npm install
npm run effect:validate
npm run effect:export
rm -rf public/vfx && cp -R vfx-project/out/vfx public/vfx
npm test
npm run build
npm run dev
```

Open the Vite URL, press **Claim reward**, resize the window, and check the effect stays centered. Turn on your system's reduced-motion preference and verify the button remains usable without particles. The exported manifest should report `supported` for `pixi2d`, and the test checks that the committed export matches the authored source.

## Files

- `vfx-project/particle-data/effects/button-edge-spark.json`: editable effect source.
- `public/vfx/`: export loaded by the game; the project source is never loaded at runtime.
- `public/button-icon.svg`: original button icon asset.
- `src/main.js`: Pixi setup, export loading, click lifecycle, and cleanup.
- `tests/export.test.mjs`: export freshness and Pixi support check.
- `assets/visual-proof.png`: screenshot of an actual click during local review.

For the full Pixi JS particle editor workflow, the [NixieFX walkthrough](https://nixiefx.com/pixijs-particle-effects/) explains the export and runtime handoff. This example includes one contextual product link.

## Limits

This example draws a small button effect and does not benchmark mobile devices. `prefers-reduced-motion` is read at page load and click time; the host application should adapt if it changes while the page is open. Visual appearance may differ by renderer and display density. Review the current NixieFX and PixiJS API versions before upgrading dependencies.

## Publishing check

Review the screenshot and code, then add the folder in a branch or fork of the upstream repository with maintainer access. Run repository checks required by its `AGENTS.md`. Request maintainer review before merge. If the account cannot write to `azakhary/nixie-fx`, a fork and pull request are needed; a local example does not count as a live GitHub post.
