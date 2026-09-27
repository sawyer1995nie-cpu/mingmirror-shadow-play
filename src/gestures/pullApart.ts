export interface MotionSample {
  time: number;
  handDistance: number;
  centerX: number;
  palmScale: number;
  openness: number;
  pinchStrength: number;
}

export function handDistanceDelta(samples: MotionSample[]) {
  if (samples.length < 2) return 0;
  return samples.at(-1)!.handDistance - samples[0].handDistance;
}
