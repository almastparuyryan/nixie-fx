import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  compareVfxExportToSources,
  loadVfxExportBundle,
} from "nixie-fx/export";

const json = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("authored button effect matches the supported Pixi export", async () => {
  const source = await json(
    "../vfx-project/particle-data/effects/button-edge-spark.json",
  );
  const manifest = await json("../public/vfx/manifest.json");
  const compiled = await json("../public/vfx/effects/button-edge-spark.json");
  const comparison = compareVfxExportToSources(manifest, [
    { path: "button-edge-spark.json", source },
  ]);
  assert.equal(comparison.outOfDate, false);
  assert.equal(manifest.effects[0].support.backends.pixi2d.status, "supported");
  const bundle = loadVfxExportBundle(
    {
      manifest,
      effectsByPath: { "effects/button-edge-spark.json": compiled },
      assetPaths: [],
    },
    { requiredBackend: "pixi2d", requireEveryAsset: true },
  );
  assert.ok(bundle.effectsById.has("button-edge-spark"));
  assert.notEqual(source.id, "impact-burst");
});
