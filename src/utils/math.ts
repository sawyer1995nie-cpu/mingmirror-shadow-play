import type { Landmark } from "../gesture/GestureState";

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

export const inverseLerp = (from: number, to: number, value: number) =>
  clamp((value - from) / (to - from));

export const distance2d = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const distance3d = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export const averageLandmarks = (landmarks: Landmark[], indices: number[]): Landmark => {
  const sum = indices.reduce(
    (acc, index) => ({
      x: acc.x + landmarks[index].x,
      y: acc.y + landmarks[index].y,
      z: acc.z + landmarks[index].z,
    }),
    { x: 0, y: 0, z: 0 },
  );
  return {
    x: sum.x / indices.length,
    y: sum.y / indices.length,
    z: sum.z / indices.length,
  };
};

export const ema = (previous: number, next: number, alpha: number) =>
  previous + (next - previous) * alpha;
