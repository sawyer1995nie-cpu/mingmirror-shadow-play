import { GestureDetector } from "./GestureDetector";
import {
  EMPTY_GESTURE_STATE,
  type GestureEvent,
  type GestureEventName,
  type GestureListener,
  type GestureState,
  type MotionGesture,
  type StaticGesture,
  type TrackedHandInput,
} from "./GestureState";
import { GestureStateMachine } from "./GestureStateMachine";

const STATIC_EVENT_MAP: Partial<Record<StaticGesture, GestureEventName>> = {
  PINCH: "pinch",
  OPEN_HAND: "open",
  FIST: "fist",
  PALMS_TOGETHER: "palmsTogether",
  FIVE_FINGER_TOUCH: "fiveFingerTouch",
};

const MOTION_EVENT_MAP: Partial<Record<MotionGesture, GestureEventName>> = {
  PULL_APART: "pullApart",
  PUSH: "push",
  PULL: "pull",
  MOVE_LEFT: "moveLeft",
  MOVE_RIGHT: "moveRight",
};

export class GestureEngine {
  state: GestureState = structuredClone(EMPTY_GESTURE_STATE);

  private detector = new GestureDetector();
  private machine = new GestureStateMachine();
  private listeners = new Map<GestureEventName, Set<GestureListener>>();
  private previousStatic: StaticGesture = "NONE";
  private previousMotion: MotionGesture = "NONE";
  private lastHoldEmit = 0;

  on(name: GestureEventName, callback: GestureListener) {
    const callbacks = this.listeners.get(name) ?? new Set<GestureListener>();
    callbacks.add(callback);
    this.listeners.set(name, callbacks);
    return () => {
      callbacks.delete(callback);
    };
  }

  update(hands: TrackedHandInput[], timestamp = performance.now()) {
    const next = this.detector.detect(hands, timestamp, this.state);
    next.phase = this.machine.transition(next);
    this.state = next;
    this.dispatchTransitions(timestamp);
    this.emit("change", "change", timestamp);
    this.previousStatic = next.currentGesture;
    this.previousMotion = next.motion;
    return next;
  }

  setPerformance(performanceState: Partial<GestureState["performance"]>) {
    this.state.performance = { ...this.state.performance, ...performanceState };
  }

  reset() {
    this.detector.reset();
    this.machine.reset();
    this.state = structuredClone(EMPTY_GESTURE_STATE);
    this.previousStatic = "NONE";
    this.previousMotion = "NONE";
  }

  private dispatchTransitions(timestamp: number) {
    const staticName = STATIC_EVENT_MAP[this.state.currentGesture];
    const previousName = STATIC_EVENT_MAP[this.previousStatic];

    if (previousName && previousName !== staticName) {
      this.emit(previousName, "end", timestamp);
      if (previousName === "pinch") this.emit("release", "trigger", timestamp);
    }
    if (staticName && staticName !== previousName) {
      this.emit(staticName, "start", timestamp);
      this.lastHoldEmit = timestamp;
    } else if (staticName && timestamp - this.lastHoldEmit > 160) {
      this.emit(staticName, "hold", timestamp);
      this.lastHoldEmit = timestamp;
    }

    const motionName = MOTION_EVENT_MAP[this.state.motion];
    const previousMotionName = MOTION_EVENT_MAP[this.previousMotion];
    if (motionName && motionName !== previousMotionName) {
      this.emit(motionName, "trigger", timestamp);
    }
  }

  private emit(name: GestureEventName, phase: GestureEvent["phase"], timestamp: number) {
    const event: GestureEvent = {
      name,
      phase,
      timestamp,
      confidence: this.state.confidence,
      state: this.state,
    };
    this.listeners.get(name)?.forEach((listener) => listener(event));
  }
}
