import { detectPinch } from "../gestures/pinch";
import { fiveFingerTouchStrength } from "../gestures/fiveFingerTouch";
import { isFist } from "../gestures/fist";
import { handOpenness, isOpenHand } from "../gestures/openHand";
import { palmsTogetherStrength } from "../gestures/palmsTogether";
import { handDistanceDelta, type MotionSample } from "../gestures/pullApart";
import { depthScaleDelta } from "../gestures/push";
import { horizontalDelta } from "../gestures/move";
import { averageLandmarks, clamp, distance2d } from "../utils/math";
import { GestureSmoother } from "./GestureSmoother";
import type {
  GestureState,
  HandState,
  MotionGesture,
  StaticGesture,
  TrackedHandInput,
} from "./GestureState";

const PALM_INDICES = [0, 5, 9, 13, 17];
const MOTION_WINDOW_MS = 560;
const MOTION_COOLDOWN_MS = 680;

export class GestureDetector {
  private smoother = new GestureSmoother(0.36);
  private motionHistory: MotionSample[] = [];
  private previousStatic: StaticGesture = "NONE";
  private previousMotion: MotionGesture = "NONE";
  private motionCooldownUntil = 0;
  private previousHandCount = 0;

  detect(hands: TrackedHandInput[], timestamp: number, previous: GestureState): GestureState {
    const active = hands.map((hand) => hand.handedness);
    this.smoother.prune(active);
    const computed = hands.map((hand) => this.smoother.smooth(this.toHandState(hand)));
    const leftHand = computed.find((hand) => hand.handedness === "left") ?? null;
    const rightHand = computed.find((hand) => hand.handedness === "right") ?? null;
    const handDistance = leftHand && rightHand
      ? distance2d(leftHand.position, rightHand.position)
      : 0;
    const togetherStrength = leftHand && rightHand
      ? palmsTogetherStrength(leftHand, rightHand)
      : 0;

    const currentGesture = this.resolveStaticGesture(
      leftHand,
      rightHand,
      togetherStrength,
      previous.currentGesture,
    );
    const motion = this.resolveMotion(computed, handDistance, timestamp);
    const confidence = this.resolveConfidence(currentGesture, computed, togetherStrength);

    this.previousStatic = currentGesture;
    this.previousMotion = motion;

    return {
      ...previous,
      timestamp,
      handsDetected: computed.length,
      twoHandsDetected: computed.length === 2,
      leftHand,
      rightHand,
      handDistance,
      palmsTogetherStrength: togetherStrength,
      currentGesture,
      motion,
      confidence,
    };
  }

  reset() {
    this.smoother.reset();
    this.motionHistory = [];
    this.previousStatic = "NONE";
    this.previousMotion = "NONE";
    this.motionCooldownUntil = 0;
    this.previousHandCount = 0;
  }

  private toHandState(input: TrackedHandInput): HandState {
    const rawCenter = averageLandmarks(input.landmarks, PALM_INDICES);
    const palmScale = Math.max(
      distance2d(input.landmarks[0], input.landmarks[9]),
      distance2d(input.landmarks[5], input.landmarks[17]),
    );
    const pinch = detectPinch(input.landmarks, palmScale);
    const fingerGatherStrength = fiveFingerTouchStrength(input.landmarks, palmScale);
    return {
      handedness: input.handedness,
      position: { x: 1 - rawCenter.x, y: rawCenter.y, z: rawCenter.z },
      rawPosition: rawCenter,
      landmarks: input.landmarks,
      pinchDistance: pinch.distance,
      pinchStrength: pinch.strength,
      fingerGatherStrength,
      openness: handOpenness(input.landmarks),
      palmScale,
      confidence: input.score,
    };
  }

  private resolveStaticGesture(
    left: HandState | null,
    right: HandState | null,
    togetherStrength: number,
    previous: StaticGesture,
  ): StaticGesture {
    const hands = [left, right].filter((hand): hand is HandState => Boolean(hand));
    if (!hands.length) return "NONE";
    if (left && right && togetherStrength >= (previous === "PALMS_TOGETHER" ? 0.64 : 0.78)) {
      return "PALMS_TOGETHER";
    }
    if (hands.some((hand) => hand.fingerGatherStrength >= (previous === "FIVE_FINGER_TOUCH" ? 0.62 : 0.78))) {
      return "FIVE_FINGER_TOUCH";
    }
    if (hands.some((hand) => hand.pinchStrength >= (previous === "PINCH" ? 0.64 : 0.78))) {
      return "PINCH";
    }
    if (hands.some((hand) => isFist(hand.openness, previous === "FIST"))) {
      return "FIST";
    }
    if (hands.some((hand) => isOpenHand(hand.openness, previous === "OPEN_HAND"))) {
      return "OPEN_HAND";
    }
    return "NONE";
  }

  private resolveMotion(
    hands: HandState[],
    handDistance: number,
    timestamp: number,
  ): MotionGesture {
    if (!hands.length) {
      this.motionHistory = [];
      this.previousHandCount = 0;
      return "NONE";
    }

    if (this.previousHandCount !== 0 && this.previousHandCount !== hands.length) {
      this.motionHistory = [];
      this.motionCooldownUntil = 0;
    }
    this.previousHandCount = hands.length;

    const centerX = hands.reduce((sum, hand) => sum + hand.position.x, 0) / hands.length;
    const palmScale = hands.reduce((sum, hand) => sum + hand.palmScale, 0) / hands.length;
    const openness = hands.reduce((sum, hand) => sum + hand.openness, 0) / hands.length;
    const pinchStrength = hands.reduce((sum, hand) => sum + hand.pinchStrength, 0) / hands.length;
    this.motionHistory.push({ time: timestamp, handDistance, centerX, palmScale, openness, pinchStrength });
    this.motionHistory = this.motionHistory.filter(
      (sample) => timestamp - sample.time <= MOTION_WINDOW_MS,
    );

    if (timestamp < this.motionCooldownUntil || this.motionHistory.length < 4) {
      return this.previousMotion !== "NONE" && timestamp < this.motionCooldownUntil - 480
        ? this.previousMotion
        : "NONE";
    }

    const span = timestamp - this.motionHistory[0].time;
    if (span < 220) return "NONE";
    const distanceDelta = handDistanceDelta(this.motionHistory);
    const scaleDelta = depthScaleDelta(this.motionHistory);
    const xDelta = horizontalDelta(this.motionHistory);
    let motion: MotionGesture = "NONE";

    if (hands.length === 2 && distanceDelta > 0.085) motion = "PULL_APART";
    else if (hands.length === 2 && distanceDelta < -0.075) motion = "HANDS_APPROACH";
    else if (openness > 0.64 && pinchStrength < 0.35 && scaleDelta > 0.18) motion = "PUSH";
    else if (openness > 0.64 && pinchStrength < 0.35 && scaleDelta < -0.14) motion = "PULL";
    else if (xDelta > 0.13) motion = "MOVE_RIGHT";
    else if (xDelta < -0.13) motion = "MOVE_LEFT";

    if (motion !== "NONE") {
      this.motionCooldownUntil = timestamp + MOTION_COOLDOWN_MS;
      this.motionHistory = this.motionHistory.slice(-2);
    }
    return motion;
  }

  private resolveConfidence(
    gesture: StaticGesture,
    hands: HandState[],
    togetherStrength: number,
  ) {
    if (!hands.length) return 0;
    const tracking = hands.reduce((sum, hand) => sum + hand.confidence, 0) / hands.length;
    let shape = 0.5;
    if (gesture === "PINCH") shape = Math.max(...hands.map((hand) => hand.pinchStrength));
    if (gesture === "OPEN_HAND") shape = Math.max(...hands.map((hand) => hand.openness));
    if (gesture === "FIST") shape = 1 - Math.min(...hands.map((hand) => hand.openness));
    if (gesture === "PALMS_TOGETHER") shape = togetherStrength;
    return clamp(tracking * 0.55 + shape * 0.45);
  }
}
