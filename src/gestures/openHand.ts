import type { Landmark } from "../gesture/GestureState";
import { distance3d } from "../utils/math";

const TIP_INDICES = [4, 8, 12, 16, 20];
const JOINT_INDICES = [3, 6, 10, 14, 18];

export function handOpenness(landmarks: Landmark[]) {
  const wrist = landmarks[0];
  const extension: number[] = TIP_INDICES.map((tip, index) => {
    const joint = JOINT_INDICES[index];
    const tipReach = distance3d(wrist, landmarks[tip]);
    const jointReach = distance3d(wrist, landmarks[joint]);
    return tipReach > jointReach * (index === 0 ? 1.08 : 1.16) ? 1 : 0;
  });
  return extension.reduce((total, value) => total + value, 0) / extension.length;
}

export const isOpenHand = (openness: number, wasOpen: boolean) =>
  openness >= (wasOpen ? 0.62 : 0.78);
