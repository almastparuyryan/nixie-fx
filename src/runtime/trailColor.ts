import type { Vec4 } from "../engine/math";
import type { ParticleTrailSettings } from "../engine/particleModuleSettings";
import {
  sampleParticleGradientAlpha,
  sampleParticleGradientColor,
} from "../engine/particles";

/** Independent trail RGBA, in authored sRGB. Renderer conversion happens after composition. */
export function sampleIndependentTrailColor(
  settings: ParticleTrailSettings,
  normalizedAge: number,
  trailPosition: number,
  out: Vec4 = [1, 1, 1, 1],
): Vec4 {
  const lifetime = settings.colorOverLifetime;
  const trail = settings.colorOverTrail;
  sampleParticleGradientColor(lifetime, normalizedAge, out);
  const r = out[0];
  const g = out[1];
  const b = out[2];
  sampleParticleGradientColor(trail, trailPosition, out);
  out[0] *= r;
  out[1] *= g;
  out[2] *= b;
  out[3] =
    sampleParticleGradientAlpha(lifetime, normalizedAge) *
    sampleParticleGradientAlpha(trail, trailPosition);
  return out;
}
