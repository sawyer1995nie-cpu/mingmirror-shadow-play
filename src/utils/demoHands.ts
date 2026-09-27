import type { Handedness, Landmark, TrackedHandInput } from "../gesture/GestureState";

const OPEN_TEMPLATE: Landmark[] = [
  { x: 0, y: 0.34, z: 0 },
  { x: -0.12, y: 0.2, z: -0.01 }, { x: -0.2, y: 0.07, z: -0.02 },
  { x: -0.27, y: -0.02, z: -0.03 }, { x: -0.32, y: -0.1, z: -0.03 },
  { x: -0.12, y: 0.02, z: -0.02 }, { x: -0.14, y: -0.13, z: -0.03 },
  { x: -0.15, y: -0.27, z: -0.04 }, { x: -0.16, y: -0.4, z: -0.04 },
  { x: 0, y: 0, z: -0.02 }, { x: 0, y: -0.17, z: -0.04 },
  { x: 0, y: -0.32, z: -0.05 }, { x: 0, y: -0.46, z: -0.05 },
  { x: 0.12, y: 0.03, z: -0.02 }, { x: 0.14, y: -0.12, z: -0.03 },
  { x: 0.15, y: -0.25, z: -0.04 }, { x: 0.16, y: -0.36, z: -0.04 },
  { x: 0.22, y: 0.1, z: -0.01 }, { x: 0.26, y: -0.02, z: -0.02 },
  { x: 0.29, y: -0.13, z: -0.03 }, { x: 0.31, y: -0.23, z: -0.03 },
];

function makeHand(
  handedness: Handedness,
  centerX: number,
  centerY: number,
  scale: number,
  shape: "open" | "pinch" | "fist" | "gather",
): TrackedHandInput {
  const points = OPEN_TEMPLATE.map((point) => ({
    x: centerX + point.x * scale * (handedness === "left" ? -1 : 1),
    y: centerY + point.y * scale,
    z: point.z * scale,
  }));
  if (shape === "pinch") {
    const meeting = {
      x: (points[4].x + points[8].x) / 2,
      y: (points[4].y + points[8].y) / 2,
      z: (points[4].z + points[8].z) / 2,
    };
    points[4] = { ...meeting, x: meeting.x - 0.002 };
    points[8] = { ...meeting, x: meeting.x + 0.002 };
  }
  if (shape === "fist") {
    [4, 8, 12, 16, 20].forEach((index, order) => {
      points[index] = {
        x: centerX + (order - 2) * 0.018 * scale,
        y: centerY + 0.04 * scale,
        z: -0.02,
      };
    });
  }
  if (shape === "gather") {
    const meeting = { x: centerX, y: centerY - 0.08 * scale, z: -0.04 * scale };
    [4, 8, 12, 16, 20].forEach((index, order) => {
      points[index] = {
        x: meeting.x + (order - 2) * 0.006,
        y: meeting.y + Math.abs(order - 2) * 0.003,
        z: meeting.z,
      };
    });
  }
  return { handedness, landmarks: points, score: 0.96 };
}

export function createDemoHands(elapsedMs: number): TrackedHandInput[] {
  const loop = elapsedMs % 16000;
  if (loop < 1800) return [makeHand("right", 0.55, 0.5, 0.48, "open")];
  if (loop < 4200) {
    const progress = (loop - 1800) / 2400;
    return [makeHand("right", 0.58 - progress * 0.18, 0.5 + Math.sin(progress * Math.PI) * 0.08, 0.5, "pinch")];
  }
  if (loop < 5200) return [makeHand("right", 0.4, 0.5, 0.5, "open")];
  if (loop < 7000) {
    const progress = (loop - 5200) / 1800;
    const gap = 0.06 + progress * 0.05;
    return [
      makeHand("left", 0.5 + gap, 0.5, 0.38, "open"),
      makeHand("right", 0.5 - gap, 0.5, 0.38, "open"),
    ];
  }
  if (loop < 9000) {
    const progress = (loop - 7000) / 2000;
    const gap = 0.11 + progress * 0.25;
    return [
      makeHand("left", 0.5 + gap, 0.5, 0.38, "open"),
      makeHand("right", 0.5 - gap, 0.5, 0.38, "open"),
    ];
  }
  if (loop < 10800) return [makeHand("right", 0.48, 0.52, 0.5, "pinch")];
  if (loop < 12200) return [makeHand("right", 0.48, 0.52, 0.5, "fist")];
  if (loop < 14800) {
    const progress = (loop - 12200) / 2600;
    return [makeHand("right", 0.5, 0.52, 0.38 + progress * 0.42, "open")];
  }
  return [];
}

export function createRitualDemoHands(elapsedMs: number): TrackedHandInput[] {
  if (elapsedMs < 300) return [];
  if (elapsedMs < 2500) {
    const progress = (elapsedMs - 300) / 2200;
    return [makeHand("right", 0.5, 0.53, 0.34 + progress * 0.42, "open")];
  }
  if (elapsedMs < 3200) return [];
  if (elapsedMs < 5900) return [makeHand("right", 0.5, 0.5, 0.5, "pinch")];
  if (elapsedMs < 7000) return [makeHand("right", 0.5, 0.5, 0.5, "open")];
  if (elapsedMs < 9800) return [makeHand("right", 0.5, 0.5, 0.5, "gather")];
  return [];
}
