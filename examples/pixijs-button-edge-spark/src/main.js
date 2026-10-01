import "./style.css";
import { Application } from "pixi.js";
import { loadVfxExportBundle } from "nixie-fx/export";
import { PixiVfxRenderer, createPixiVfx2dProjection } from "nixie-fx/pixi";

const stage = document.querySelector("#stage");
const button = document.querySelector("#claim");
const status = document.querySelector("#status");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

async function start() {
  const manifest = await getJson("/vfx/manifest.json");
  const effectsByPath = Object.fromEntries(
    await Promise.all(
      manifest.effects.map(async ({ path }) => [
        path,
        await getJson(`/vfx/${path}`),
      ]),
    ),
  );
  const bundle = loadVfxExportBundle(
    {
      manifest,
      effectsByPath,
      assetPaths: manifest.assets.map(({ path }) => path),
    },
    { requiredBackend: "pixi2d", requireEveryAsset: true },
  );
  const effect = bundle.effectsById.get("button-edge-spark");
  if (!effect) throw new Error("button-edge-spark missing from export");

  const app = new Application();
  await app.init({
    width: stage.clientWidth,
    height: stage.clientHeight,
    backgroundAlpha: 0,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  stage.appendChild(app.canvas);
  const vfx = new PixiVfxRenderer({
    parent: app.stage,
    projection: createPixiVfx2dProjection({
      originX: app.screen.width / 2,
      originY: app.screen.height / 2,
      pixelsPerUnit: 145,
      yAxis: "up",
    }),
  });
  const live = new Set();
  let pressCount = 0;
  button.addEventListener("click", () => {
    if (reducedMotion.matches) {
      status.textContent =
        "Claimed. Particle motion is disabled by system preference.";
      return;
    }
    const instance = vfx.createEffect(effect, {
      position: [0, 0, 0],
      seed: ++pressCount,
    });
    live.add(instance);
    status.textContent = `Claimed. Burst ${pressCount} played.`;
  });
  app.ticker.add((ticker) => {
    vfx.update(ticker.deltaMS / 1000);
    for (const instance of live) {
      if (!instance.isActive) {
        vfx.removeEffect(instance, true);
        live.delete(instance);
      }
    }
  });
  const resize = new ResizeObserver(() => {
    app.renderer.resize(stage.clientWidth, stage.clientHeight);
    vfx.setProjection(
      createPixiVfx2dProjection({
        originX: app.screen.width / 2,
        originY: app.screen.height / 2,
        pixelsPerUnit: 145,
        yAxis: "up",
      }),
    );
  });
  resize.observe(stage);
  window.addEventListener(
    "pagehide",
    () => {
      resize.disconnect();
      vfx.destroy();
      app.destroy(true);
    },
    { once: true },
  );
  status.textContent = "Ready. Press Claim reward.";
}

start().catch((error) => {
  status.textContent = error.message;
  console.error(error);
});
