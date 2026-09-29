import {
  BoxGeometry,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { normalizeParticleEffect } from "../../src/engine/particles";
import {
  createMaterialInstance,
  normalizeShaderGraph,
} from "../../src/runtime/schema/materials";
import { createThreeEmitterMaterial } from "../../src/runtime/three/materialAdapter";

// Browser GPU regression: run in a headed browser. Results are text only.
const results: string[] = [];
try {
  const graph = normalizeShaderGraph({
    id: "translucent-face-check",
    name: "Translucent face check",
    blend: "normal",
    side: "double",
    nodes: [
      { id: "face", type: "twoSidedSign", inputs: {}, params: {} },
      {
        id: "clamp",
        type: "clamp",
        inputs: { in: "sign" },
        params: { min: 0, max: 1 },
      },
      {
        id: "blue",
        type: "constant",
        inputs: {},
        params: { value: [0, 0, 1, 1] },
      },
      {
        id: "red",
        type: "constant",
        inputs: {},
        params: { value: [1, 0, 0, 1] },
      },
      {
        id: "color",
        type: "lerp",
        inputs: { a: "a", b: "b", t: "t" },
        params: {},
      },
      { id: "alpha", type: "constant", inputs: {}, params: { value: 0.5 } },
    ],
    edges: [
      {
        id: "sign",
        source: "face",
        sourceHandle: "Sign",
        target: "clamp",
        targetHandle: "in",
      },
      {
        id: "a",
        source: "blue",
        sourceHandle: "Out",
        target: "color",
        targetHandle: "a",
      },
      {
        id: "b",
        source: "red",
        sourceHandle: "Out",
        target: "color",
        targetHandle: "b",
      },
      {
        id: "t",
        source: "clamp",
        sourceHandle: "Out",
        target: "color",
        targetHandle: "t",
      },
      {
        id: "out",
        source: "color",
        sourceHandle: "Out",
        target: "output",
        targetHandle: "baseColor",
      },
      {
        id: "opacity",
        source: "alpha",
        sourceHandle: "Out",
        target: "output",
        targetHandle: "opacity",
      },
    ],
    outputs: { baseColor: "out", opacity: "opacity" },
  });
  const effect = normalizeParticleEffect({
    emitters: [
      {
        mode: "mesh",
        mesh: { renderMode: "meshAsset" },
        render: {
          material: createMaterialInstance(graph, "i"),
          depthWrite: false,
        },
      },
    ],
  });
  const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  texture.needsUpdate = true;
  const camera = new PerspectiveCamera(45, 1, 0.1, 20);
  const { material } = createThreeEmitterMaterial(effect.emitters[0]!, {
    effect,
    camera,
    textureProvider: { getTexture: () => texture },
    materialGraphProvider: () => graph,
  });
  const singlePassDefault = material.forceSinglePass;
  const geometry = new BoxGeometry(2, 2, 2);
  const mesh = new Mesh(geometry, material);
  const scene = new Scene();
  scene.add(mesh);
  const renderer = new WebGLRenderer();
  renderer.setSize(32, 32);
  const target = new WebGLRenderTarget(32, 32);
  renderer.setRenderTarget(target);
  const index = Array.from(geometry.index!.array);
  for (const reverse of [false, true]) {
    geometry.setIndex(
      reverse
        ? Array.from({ length: index.length / 3 }, (_, i) =>
            index.slice(index.length - 3 * (i + 1), index.length - 3 * i),
          ).flat()
        : index,
    );
    for (const z of [4, -4]) {
      camera.position.set(0.2, 0.1, z);
      camera.lookAt(0, 0, 0);
      for (const baseline of [true, false]) {
        material.forceSinglePass = baseline ? true : singlePassDefault;
        renderer.render(scene, camera);
        const pixel = new Uint8Array(4);
        renderer.readRenderTargetPixels(target, 16, 16, 1, 1, pixel);
        const pass =
          Math.abs(pixel[0]! - 128) < 3 &&
          pixel[1] === 0 &&
          Math.abs(pixel[2]! - 64) < 3;
        results.push(
          `${baseline ? "BASELINE" : pass ? "PASS" : "FAIL"} reversed=${reverse} cameraZ=${z}: ${Array.from(pixel)} draws=${renderer.info.render.calls}`,
        );
      }
    }
  }
  material.dispose();
  geometry.dispose();
  texture.dispose();
  target.dispose();
  renderer.dispose();
} catch (error) {
  results.push(`FAIL ${String(error)}`);
}
document.body.textContent = results.join("\n");
document.body.style.whiteSpace = "pre-wrap";
