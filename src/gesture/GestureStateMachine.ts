import type { GestureState, InteractionPhase, MotionGesture, StaticGesture } from "./GestureState";

export class GestureStateMachine {
  private previousStatic: StaticGesture = "NONE";
  private previousMotion: MotionGesture = "NONE";

  transition(next: GestureState): InteractionPhase {
    let phase: InteractionPhase;
    if (next.currentGesture === "PINCH") {
      phase = this.previousStatic === "PINCH" ? "PINCH_HOLD" : "PINCH_START";
    } else if (this.previousStatic === "PINCH") phase = "PINCH_RELEASE";
    else if (next.currentGesture === "FIVE_FINGER_TOUCH") {
      phase = this.previousStatic === "FIVE_FINGER_TOUCH" ? "FIVE_TOUCH_HOLD" : "FIVE_TOUCH_START";
    } else if (this.previousStatic === "FIVE_FINGER_TOUCH") phase = "FIVE_TOUCH_RELEASE";
    else if (next.motion === "PULL_APART") phase = "PULL_APART";
    else if (next.motion === "HANDS_APPROACH") phase = "HANDS_APPROACH";
    else if (next.motion === "PUSH") {
      phase = this.previousMotion === "PUSH" ? "PUSH_PROGRESS" : "PUSH_START";
    } else if (this.previousMotion === "PUSH") phase = "PUSH_END";
    else if (next.motion === "PULL") {
      phase = this.previousMotion === "PULL" ? "PULL_PROGRESS" : "PULL_START";
    } else if (this.previousMotion === "PULL") phase = "PULL_END";
    else if (next.twoHandsDetected) phase = "TWO_HANDS_DETECTED";
    else if (next.handsDetected) phase = "HAND_DETECTED";
    else phase = "IDLE";

    this.previousStatic = next.currentGesture;
    this.previousMotion = next.motion;
    return phase;
  }

  reset() {
    this.previousStatic = "NONE";
    this.previousMotion = "NONE";
  }
}
