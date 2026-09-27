import type { MotionSample } from "./pullApart";

export function depthScaleDelta(samples: MotionSample[]) {
  if (samples.length < 2) return 0;
  const first = samples[0].palmScale;
  return (samples.at(-1)!.palmScale - first) / Math.max(first, 0.001);
}
