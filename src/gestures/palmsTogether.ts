import type { HandState } from "../gesture/GestureState";
import { clamp, distance2d, inverseLerp } from "../utils/math";

export function palmsTogetherStrength(left: HandState, right: HandState) {
  const distance = distance2d(left.position, right.position);
  const heightAlignment = Math.abs(left.position.y - right.position.y);
  const openness = Math.min(left.openness, right.openness);
  const proximity = 1 - inverseLerp(0.08, 0.28, distance);
  const alignment = 1 - inverseLerp(0.03, 0.18, heightAlignment);
  return clamp(proximity * 0.55 + alignment * 0.2 + openness * 0.25);
}
