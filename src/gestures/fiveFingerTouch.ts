import type { Landmark } from "../gesture/GestureState";
import { averageLandmarks, clamp, distance3d, inverseLerp } from "../utils/math";

const FINGERTIPS = [4, 8, 12, 16, 20];

export function fiveFingerTouchStrength(landmarks: Landmark[], palmScale: number) {
  const center = averageLandmarks(landmarks, FINGERTIPS);
  const spread = Math.max(...FINGERTIPS.map((index) => distance3d(landmarks[index], center)));
  const normalized = spread / Math.max(palmScale, 0.001);
  return clamp(1 - inverseLerp(0.22, 0.62, normalized));
}
