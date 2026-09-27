import type { HandState, Handedness } from "./GestureState";
import { ema } from "../utils/math";

export class GestureSmoother {
  private previous = new Map<Handedness, HandState>();

  constructor(private readonly alpha = 0.36) {}

  smooth(hand: HandState): HandState {
    const before = this.previous.get(hand.handedness);
    if (!before) {
      this.previous.set(hand.handedness, hand);
      return hand;
    }

    const smoothValue = (a: number, b: number) => ema(a, b, this.alpha);
    const next: HandState = {
      ...hand,
      position: {
        x: smoothValue(before.position.x, hand.position.x),
        y: smoothValue(before.position.y, hand.position.y),
        z: smoothValue(before.position.z, hand.position.z),
      },
      pinchDistance: smoothValue(before.pinchDistance, hand.pinchDistance),
      pinchStrength: smoothValue(before.pinchStrength, hand.pinchStrength),
      fingerGatherStrength: smoothValue(before.fingerGatherStrength, hand.fingerGatherStrength),
      openness: smoothValue(before.openness, hand.openness),
      palmScale: smoothValue(before.palmScale, hand.palmScale),
      confidence: smoothValue(before.confidence, hand.confidence),
    };
    this.previous.set(hand.handedness, next);
    return next;
  }

  prune(active: Handedness[]) {
    for (const key of this.previous.keys()) {
      if (!active.includes(key)) this.previous.delete(key);
    }
  }

  reset() {
    this.previous.clear();
  }
}
