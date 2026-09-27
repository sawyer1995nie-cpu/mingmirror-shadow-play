import { useEffect, useRef, useState } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";
import { HandTracker } from "../gesture/HandTracker";
import type { HandState } from "../gesture/GestureState";
import { createDemoHands } from "../utils/demoHands";
import { averageLandmarks } from "../utils/math";

type FeedMode = "idle" | "loading" | "camera" | "demo" | "error";

interface CameraViewProps {
  engine: GestureEngine;
}

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
] as const;
const FINGERTIPS = new Set([4, 8, 12, 16, 20]);

function drawHands(canvas: HTMLCanvasElement, hands: HandState[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  hands.forEach((hand) => {
    const color = hand.handedness === "left" ? "#79e6d0" : "#ef9b6b";
    const point = (index: number) => ({
      x: (1 - hand.landmarks[index].x) * width,
      y: hand.landmarks[index].y * height,
    });
    context.strokeStyle = color;
    context.globalAlpha = 0.56;
    context.lineWidth = 1.25;
    CONNECTIONS.forEach(([from, to]) => {
      const a = point(from);
      const b = point(to);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    });

    hand.landmarks.forEach((_, index) => {
      const p = point(index);
      context.beginPath();
      context.fillStyle = color;
      context.globalAlpha = FINGERTIPS.has(index) ? 1 : 0.72;
      context.arc(p.x, p.y, FINGERTIPS.has(index) ? 4.3 : 2.3, 0, Math.PI * 2);
      context.fill();
    });

    const palm = averageLandmarks(hand.landmarks, [0, 5, 9, 13, 17]);
    const palmPoint = { x: (1 - palm.x) * width, y: palm.y * height };
    context.globalAlpha = 1;
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(palmPoint.x, palmPoint.y, 10, 0, Math.PI * 2);
    context.stroke();

    const thumb = point(4);
    const index = point(8);
    context.setLineDash([4, 4]);
    context.beginPath();
    context.moveTo(thumb.x, thumb.y);
    context.lineTo(index.x, index.y);
    context.stroke();
    context.setLineDash([]);
    const labelX = (thumb.x + index.x) / 2;
    const labelY = (thumb.y + index.y) / 2;
    context.font = "10px ui-monospace, monospace";
    context.fillStyle = color;
    context.fillText(`${hand.handedness.toUpperCase()} · ${Math.round(hand.pinchStrength * 100)}%`, labelX + 8, labelY - 8);
  });
  context.globalAlpha = 1;
}

export function CameraView({ engine }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const frameRef = useRef(0);
  const modeRef = useRef<FeedMode>("idle");
  const [mode, setMode] = useState<FeedMode>("idle");
  const [message, setMessage] = useState("Camera stays on this device. Nothing is uploaded.");

  const setFeedMode = (next: FeedMode) => {
    modeRef.current = next;
    setMode(next);
  };

  const stop = () => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackerRef.current?.close();
    trackerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    engine.reset();
  };

  const startCamera = async () => {
    stop();
    if (!window.isSecureContext && location.hostname !== "localhost") {
      setFeedMode("error");
      setMessage("Camera access requires HTTPS or localhost.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setFeedMode("error");
      setMessage("This browser does not expose a camera API.");
      return;
    }
    try {
      setFeedMode("loading");
      setMessage("Waiting for camera permission…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setMessage("Loading the on-device hand model…");
      const tracker = new HandTracker();
      await tracker.initialize();
      trackerRef.current = tracker;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setFeedMode("camera");
      setMessage("Live · on-device processing");
      runCameraLoop();
    } catch (error) {
      stop();
      setFeedMode("error");
      const name = error instanceof DOMException ? error.name : "CameraError";
      setMessage(
        name === "NotAllowedError"
          ? "Camera permission was declined. Use simulated signal or allow access in browser settings."
          : name === "NotFoundError"
            ? "No camera was found. Use simulated signal to explore the engine."
            : "The camera could not start. Close other camera apps and try again.",
      );
    }
  };

  const runCameraLoop = () => {
    let lastInferenceAt = 0;
    let frames = 0;
    let sampleStarted = performance.now();
    const tick = (now: number) => {
      if (modeRef.current !== "camera") return;
      const video = videoRef.current;
      const tracker = trackerRef.current;
      if (video && tracker && now - lastInferenceAt >= 30) {
        const result = tracker.detect(video, now);
        if (result) {
          const state = engine.update(result.hands, now);
          drawHands(canvasRef.current!, [state.leftHand, state.rightHand].filter((hand): hand is HandState => Boolean(hand)));
          lastInferenceAt = now;
          frames += 1;
          if (now - sampleStarted >= 1000) {
            const settings = streamRef.current?.getVideoTracks()[0]?.getSettings();
            engine.setPerformance({
              cameraFps: settings?.frameRate ?? frames,
              inferenceFps: (frames * 1000) / (now - sampleStarted),
              inferenceMs: result.inferenceMs,
              frameAgeMs: result.inferenceMs,
            });
            frames = 0;
            sampleStarted = now;
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const startDemo = () => {
    stop();
    setFeedMode("demo");
    setMessage("Simulated landmarks · same Gesture Engine");
    const started = performance.now();
    let frames = 0;
    let sampleStarted = started;
    const tick = (now: number) => {
      if (modeRef.current !== "demo") return;
      const state = engine.update(createDemoHands(now - started), now);
      drawHands(canvasRef.current!, [state.leftHand, state.rightHand].filter((hand): hand is HandState => Boolean(hand)));
      frames += 1;
      if (now - sampleStarted >= 1000) {
        engine.setPerformance({ cameraFps: 0, inferenceFps: (frames * 1000) / (now - sampleStarted), inferenceMs: 0, frameAgeMs: 0 });
        frames = 0;
        sampleStarted = now;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stop(), []);

  return (
    <section className="camera-card" aria-label="Camera and hand landmarks">
      <div className="camera-card__heading">
        <div>
          <p className="eyebrow">Input / local only</p>
          <h2>Hand field</h2>
        </div>
        <span className={`feed-badge feed-badge--${mode}`}>
          <i /> {mode === "camera" ? "LIVE" : mode === "demo" ? "SIM" : mode.toUpperCase()}
        </span>
      </div>
      <div className="camera-stage">
        <video ref={videoRef} muted playsInline aria-label="Mirrored camera preview" />
        <canvas ref={canvasRef} aria-hidden="true" />
        {mode !== "camera" && <div className="camera-stage__void" aria-hidden="true"><span /></div>}
        {(mode === "idle" || mode === "error") && (
          <div className="camera-stage__gate">
            <p>{message}</p>
            <div className="button-row">
              <button className="primary-button" onClick={startCamera}>Enable camera</button>
              <button className="text-button" onClick={startDemo}>Run simulated signal</button>
            </div>
          </div>
        )}
        {mode === "loading" && <div className="camera-stage__gate"><span className="loader" /><p>{message}</p></div>}
      </div>
      <div className="camera-card__footer">
        <span>{message}</span>
        {(mode === "camera" || mode === "demo") && (
          <button className="text-button" onClick={() => { stop(); setFeedMode("idle"); setMessage("Camera stays on this device. Nothing is uploaded."); }}>Stop feed</button>
        )}
      </div>
    </section>
  );
}
