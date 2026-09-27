import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { TrackedHandInput } from "./GestureState";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export interface TrackerFrame {
  hands: TrackedHandInput[];
  raw: HandLandmarkerResult;
  inferenceMs: number;
  timestamp: number;
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  async initialize() {
    if (this.landmarker) return;
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    try {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.58,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
    } catch {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.58,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
    }
  }

  detect(video: HTMLVideoElement, timestamp: number): TrackerFrame | null {
    if (!this.landmarker || video.readyState < 2 || video.currentTime === this.lastVideoTime) {
      return null;
    }
    this.lastVideoTime = video.currentTime;
    const started = performance.now();
    const raw = this.landmarker.detectForVideo(video, timestamp);
    const inferenceMs = performance.now() - started;
    const hands: TrackedHandInput[] = raw.landmarks.map((landmarks, index) => {
      const category = raw.handedness[index]?.[0];
      return {
        handedness: category?.categoryName?.toLowerCase() === "left" ? "left" : "right",
        landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
        score: category?.score ?? 0.5,
      };
    });
    return { hands, raw, inferenceMs, timestamp };
  }

  close() {
    this.landmarker?.close();
    this.landmarker = null;
    this.lastVideoTime = -1;
  }
}
