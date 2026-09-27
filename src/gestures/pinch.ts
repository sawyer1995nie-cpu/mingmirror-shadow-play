import type { Landmark } from "../gesture/GestureState";
import { clamp, distance3d, inverseLerp } from "../utils/math";

export function detectPinch(landmarks: Landmark[], palmScale: number) {
  const distance = distance3d(landmarks[4], landmarks[8]);
  const normalized = distance / Math.max(palmScale, 0.001);
  return {
    distance: normalized,
    strength: clamp(1 - inverseLerp(0.22, 0.92, normalized)),
  };
}
