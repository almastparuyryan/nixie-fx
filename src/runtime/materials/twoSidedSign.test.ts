import { describe, expect, it } from "vitest";
import {
  BackSide,
  DoubleSide,
  FrontSide,
  PerspectiveCamera,
  ShaderMaterial,
  Texture,
} from "three";
import { normalizeParticleEffect } from "../../engine/particles";
import { createThreeEmitterMaterial } from "../three/materialAdapter";
import {
  createMaterialInstance,
  normalizeShaderGraph,
  serializeShaderGraph,
} from "../schema/materials";
import { analyzeGraphTier, compileMaterial } from "./compileMaterial";
import { BAKEABLE_NODE_TYPES } from "./bake";
import {
  createMaterialPreviewFragment,
  createMaterialNodePreviewFragmentSource,
} from "./materialShaderCompiler";

function graph() {
  return normalizeShaderGraph({
    id: "two-sided-test",
    name: "Two Sided Sign",
    blend: "opaque",
    nodes: [{ id: "face", type: "twoSidedSign", inputs: {}, params: {} }],
    edges: [
      {
        id: "color",
        source: "face",
        sourceHandle: "Sign",
        target: "output",
        targetHandle: "baseColor",
      },
    ],
    outputs: { baseColor: "color" },
  });
}

describe("Two Sided Sign", () => {
  it.each([
    ["mesh", "meshAsset", "normal", "double", false],
    ["mesh", "meshAsset", "normal", "front", true],
    ["mesh", "meshAsset", "normal", "back", true],
    ["mesh", "meshAsset", "opaque", "double", true],
    ["mesh", "meshAsset", "masked", "double", true],
    ["mesh", "meshAsset", "add", "double", true],
    ["mesh", "pixiShard", "normal", "double", true],
    ["billboard", "pixiShard", "normal", "double", true],
  ] as const)(
    "uses the appropriate pass count for %s/%s/%s/%s",
    (mode, renderMode, blend, side, singlePass) => {
      const g = graph();
      g.blend = blend;
      g.side = side;
      const effect = normalizeParticleEffect({
        emitters: [
          {
            mode,
            mesh: { renderMode },
            render: {
              material: createMaterialInstance(g, "i"),
              depthWrite: false,
            },
          },
        ],
      });
      const texture = new Texture();
      const { material } = createThreeEmitterMaterial(effect.emitters[0]!, {
        effect,
        camera: new PerspectiveCamera(),
        textureProvider: { getTexture: () => texture },
        materialGraphProvider: () => g,
      });
      expect(material.forceSinglePass).toBe(singlePass);
      expect(material.side).toBe(
        side === "double"
          ? DoubleSide
          : side === "front"
            ? FrontSide
            : BackSide,
      );
      expect(material.depthTest).toBe(true);
      if (blend === "normal") expect(material.depthWrite).toBe(false);
      material.dispose();
      texture.dispose();
    },
  );
  it("survives serialization and requires fragment evaluation only when connected", () => {
    const g = graph();
    expect(normalizeShaderGraph(serializeShaderGraph(g))).toEqual(g);
    expect(BAKEABLE_NODE_TYPES.has("twoSidedSign")).toBe(false);
    expect(analyzeGraphTier(g).tier).toBe("tier2-shader");
    g.outputs = {};
    expect(analyzeGraphTier(g).tier).toBe("tier1-fixed");
  });

  it("compiles actual face orientation in material and node previews", () => {
    const g = graph();
    const instance = createMaterialInstance(g, "i");
    const artifact = compileMaterial(g, instance);
    const source = createMaterialPreviewFragment({
      graph: g,
      instance,
      artifact,
    });
    expect(source?.fragment).toContain("vec4(materialTwoSidedSign())");
    expect(source?.fragment).toContain("#ifdef FLIP_SIDED");
    expect(source?.fragment).toContain("return gl_FrontFacing ? -1.0 : 1.0;");
    expect(source?.fragment).toContain("return gl_FrontFacing ? 1.0 : -1.0;");
    expect(source?.diagnostics).toEqual([]);
    expect(
      createMaterialNodePreviewFragmentSource({
        graph: g,
        instance,
        nodeId: "face",
        sourceHandle: "Sign",
      }),
    ).toContain("vec4(materialTwoSidedSign())");
  });

  it.each([
    ["front", FrontSide],
    ["back", BackSide],
    ["double", DoubleSide],
  ] as const)(
    "preserves %s sidedness in the Three material",
    (side, expected) => {
      const g = graph();
      g.side = side;
      const before = serializeShaderGraph(g);
      const effect = normalizeParticleEffect({
        emitters: [{ render: { material: createMaterialInstance(g, "i") } }],
      });
      const texture = new Texture();
      const result = createThreeEmitterMaterial(effect.emitters[0]!, {
        effect,
        camera: new PerspectiveCamera(),
        textureProvider: { getTexture: () => texture },
        materialGraphProvider: () => g,
      });
      expect(result.material).toBeInstanceOf(ShaderMaterial);
      expect((result.material as ShaderMaterial).fragmentShader).toContain(
        "gl_FrontFacing ? 1.0 : -1.0",
      );
      expect(result.material.side).toBe(expected);
      expect(serializeShaderGraph(g)).toEqual(before);
      result.material.dispose();
      texture.dispose();
    },
  );
});
