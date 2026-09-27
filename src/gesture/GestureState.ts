export type Handedness = "left" | "right";

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface TrackedHandInput {
  handedness: Handedness;
  landmarks: Landmark[];
  score: number;
}

export interface HandState {
  handedness: Handedness;
  position: Landmark;
  rawPosition: Landmark;
  landmarks: Landmark[];
  pinchDistance: number;
  pinchStrength: number;
  fingerGatherStrength: number;
  openness: number;
  palmScale: number;
  confidence: number;
}

export type StaticGesture =
  | "NONE"
  | "OPEN_HAND"
  | "FIST"
  | "PINCH"
  | "FIVE_FINGER_TOUCH"
  | "PALMS_TOGETHER";

export type MotionGesture =
  | "NONE"
  | "HANDS_APPROACH"
  | "PULL_APART"
  | "PUSH"
  | "PULL"
  | "MOVE_LEFT"
  | "MOVE_RIGHT";

export type InteractionPhase =
  | "IDLE"
  | "HAND_DETECTED"
  | "TWO_HANDS_DETECTED"
  | "PINCH_START"
  | "PINCH_HOLD"
  | "PINCH_RELEASE"
  | "FIVE_TOUCH_START"
  | "FIVE_TOUCH_HOLD"
  | "FIVE_TOUCH_RELEASE"
  | "HANDS_APPROACH"
  | "HANDS_HOLD"
  | "PULL_APART"
  | "PUSH_START"
  | "PUSH_PROGRESS"
  | "PUSH_END"
  | "PULL_START"
  | "PULL_PROGRESS"
  | "PULL_END";

export interface PerformanceState {
  cameraFps: number;
  inferenceFps: number;
  inferenceMs: number;
  frameAgeMs: number;
}

export interface GestureState {
  timestamp: number;
  handsDetected: number;
  twoHandsDetected: boolean;
  leftHand: HandState | null;
  rightHand: HandState | null;
  handDistance: number;
  palmsTogetherStrength: number;
  currentGesture: StaticGesture;
  motion: MotionGesture;
  phase: InteractionPhase;
  confidence: number;
  performance: PerformanceState;
}

export const EMPTY_GESTURE_STATE: GestureState = {
  timestamp: 0,
  handsDetected: 0,
  twoHandsDetected: false,
  leftHand: null,
  rightHand: null,
  handDistance: 0,
  palmsTogetherStrength: 0,
  currentGesture: "NONE",
  motion: "NONE",
  phase: "IDLE",
  confidence: 0,
  performance: {
    cameraFps: 0,
    inferenceFps: 0,
    inferenceMs: 0,
    frameAgeMs: 0,
  },
};

export type GestureEventName =
  | "pinch"
  | "open"
  | "fist"
  | "palmsTogether"
  | "fiveFingerTouch"
  | "pullApart"
  | "push"
  | "pull"
  | "moveLeft"
  | "moveRight"
  | "release"
  | "change";

export type GestureEventPhase = "start" | "hold" | "end" | "trigger" | "change";

export interface GestureEvent {
  name: GestureEventName;
  phase: GestureEventPhase;
  timestamp: number;
  confidence: number;
  state: GestureState;
}

export type GestureListener = (event: GestureEvent) => void;
