import { describe, expect, it } from "vitest";
import {
  normalizeParticleEffect,
  normalizeParticleGradient,
} from "../engine/particles";
import { compileVfxEffect } from "../export/compiler";
import { sampleIndependentTrailColor } from "./trailColor";

const gradient = (start: [number, number, number, number], end = start) =>
  normalizeParticleGradient(undefined, start, end);
const settings = (trails: Record<string, unknown> = {}) =>
  normalizeParticleEffect({ emitters: [{ advanced: { trails } }] }).emitters[0]!
    .advanced.trails;

const expectRgba = (actual: number[], expected: number[]) => {
  expected.forEach((value, index) =>
    expect(actual[index]).toBeCloseTo(value, 6),
  );
};

describe("independent trail colors", () => {
  it("defaults to opaque white and migrates the legacy position gradient", () => {
    expectRgba(sampleIndependentTrailColor(settings(), 0.7, 0.8), [1, 1, 1, 1]);
    const color = gradient([1, 0, 0, 0.5]);
    const migrated = settings({ color });
    expect(migrated.color).toEqual(color);
    expect(migrated.colorOverTrail).toEqual(color);
    expectRgba(sampleIndependentTrailColor(migrated, 0.7, 0.8), [1, 0, 0, 0.5]);
  });

  it("samples age and position independently and multiplies RGB and opacity", () => {
    const trails = settings({
      colorOverLifetime: gradient([1, 1, 1, 1], [0, 1, 1, 0.5]),
      colorOverTrail: gradient([1, 1, 1, 1], [1, 0, 1, 0.5]),
    });
    expectRgba(
      sampleIndependentTrailColor(trails, 0.5, 0.25),
      [0.735356983, 0.880825021, 1, 0.65625],
    );
    expectRgba(sampleIndependentTrailColor(trails, 1, 0), [0, 1, 1, 0.5]);
    expectRgba(sampleIndependentTrailColor(trails, 0, 1), [1, 0, 1, 0.5]);
  });

  it("preserves fixed gradients and both controls through serialization and export", () => {
    const trails = settings({
      inheritColor: false,
      colorOverLifetime: {
        ...gradient([1, 0, 0, 1], [0, 1, 0, 0.5]),
        mode: "fixed",
      },
      colorOverTrail: gradient([0.5, 1, 1, 0.8]),
    });
    const source = JSON.parse(
      JSON.stringify({ emitters: [{ advanced: { trails } }] }),
    );
    const exported =
      compileVfxEffect(source).effect.emitters[0]!.advanced.trails;
    expect(exported.colorOverLifetime).toEqual(trails.colorOverLifetime);
    expect(exported.colorOverTrail).toEqual(trails.colorOverTrail);
    expect(settings(exported).inheritColor).toBe(false);
    expectRgba(
      sampleIndependentTrailColor(settings(exported), 0.5, 0.5),
      [0.5, 0, 0, 0.8],
    );
  });
});
