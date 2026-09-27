import type { MotionSample } from "./pullApart";

export function horizontalDelta(samples: MotionSample[]) {
  if (samples.length < 2) return 0;
  return samples.at(-1)!.centerX - samples[0].centerX;
}
