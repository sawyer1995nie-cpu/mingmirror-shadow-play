import { useEffect, useMemo, useRef, useState } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";
import { HandTracker } from "../gesture/HandTracker";
import type { GestureState, HandState } from "../gesture/GestureState";
import { createDemoHands } from "../utils/demoHands";

type InputMode = "idle" | "loading" | "camera" | "demo" | "error";

const MODE_LABEL: Record<InputMode, string> = {
  idle: "尚未入戏",
  loading: "正在识手",
  camera: "手势已启用",
  demo: "演示运行中",
  error: "手势未开启",
};

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
] as const;

function CalibrationHand({ hand }: { hand: HandState | null }) {
  const paths = useMemo(() => {
    if (!hand) return [];
    return CONNECTIONS.map(([from, to]) => {
      const a = hand.landmarks[from];
      const b = hand.landmarks[to];
      return `M${(1 - a.x) * 100} ${a.y * 100}L${(1 - b.x) * 100} ${b.y * 100}`;
    });
  }, [hand]);

  return (
    <svg className="calibration-hand" viewBox="0 0 100 100" aria-label={hand ? "当前手部骨架" : "等待识别手部"}>
      <circle className="calibration-ring" cx="50" cy="50" r="33" />
      {paths.map((path, index) => <path key={index} d={path} />)}
      {hand?.landmarks.map((point, index) => {
        const tipNames: Record<number, string> = { 4: "thumb", 8: "index", 12: "middle", 16: "ring", 20: "little" };
        const tipName = tipNames[index];
        return <circle key={index} className={tipName ? `is-tip tip-${tipName}` : ""} cx={(1 - point.x) * 100} cy={point.y * 100} r={tipName ? 1.8 : 1.05} />;
      })}
      {!hand && <g className="calibration-placeholder"><path d="M38 69V43c0-4 6-4 6 0v10-24c0-5 7-5 7 0v23-28c0-5 7-5 7 0v28-23c0-5 7-5 7 0v27-16c0-5 7-5 7 0v23c0 15-8 24-21 24-8 0-14-6-19-13l-8-12c-3-5 3-9 7-5Z" /></g>}
    </svg>
  );
}

export function GestureInput({ engine }: { engine: GestureEngine }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const frameRef = useRef(0);
  const modeRef = useRef<InputMode>("idle");
  const [mode, setMode] = useState<InputMode>("idle");
  const [panelOpen, setPanelOpen] = useState(false);
  const [state, setState] = useState<GestureState>({ ...engine.state });
  const [message, setMessage] = useState("影像只在当前设备内识别，不展示、不上传");

  const changeMode = (next: InputMode) => {
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

  const runCamera = () => {
    let lastInferenceAt = 0;
    let frames = 0;
    let sampledAt = performance.now();
    const tick = (now: number) => {
      if (modeRef.current !== "camera") return;
      const video = videoRef.current;
      const tracker = trackerRef.current;
      if (video && tracker && now - lastInferenceAt >= 30) {
        const result = tracker.detect(video, now);
        if (result) {
          engine.update(result.hands, now);
          lastInferenceAt = now;
          frames += 1;
          if (now - sampledAt >= 1000) {
            const settings = streamRef.current?.getVideoTracks()[0]?.getSettings();
            engine.setPerformance({
              cameraFps: settings?.frameRate ?? frames,
              inferenceFps: (frames * 1000) / (now - sampledAt),
              inferenceMs: result.inferenceMs,
              frameAgeMs: result.inferenceMs,
            });
            frames = 0;
            sampledAt = now;
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    stop();
    setPanelOpen(true);
    if (!window.isSecureContext && location.hostname !== "localhost") {
      changeMode("error");
      setMessage("请通过 HTTPS 或 localhost 打开，浏览器才能使用摄像头");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      changeMode("error");
      setMessage("当前浏览器不支持摄像头手势，可先运行演示");
      return;
    }
    try {
      changeMode("loading");
      setMessage("请允许摄像头权限；画面不会显示");
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
      setMessage("正在加载本机手势模型");
      const tracker = new HandTracker();
      await tracker.initialize();
      trackerRef.current = tracker;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      changeMode("camera");
      setMessage("识别稳定。现在可以关闭校准窗，直接操控皮影");
      runCamera();
    } catch (error) {
      stop();
      changeMode("error");
      const name = error instanceof DOMException ? error.name : "CameraError";
      setMessage(
        name === "NotAllowedError"
          ? "摄像头权限未开启，请修改浏览器权限或运行演示"
          : name === "NotFoundError"
            ? "没有找到可用摄像头，可以先运行演示"
            : "摄像头未能启动，请关闭其他占用摄像头的应用后重试",
      );
    }
  };

  const startDemo = () => {
    stop();
    setPanelOpen(false);
    changeMode("demo");
    setMessage("模拟手势正在循环演示，使用同一套 Gesture Engine");
    const started = performance.now();
    let frames = 0;
    let sampledAt = started;
    const tick = (now: number) => {
      if (modeRef.current !== "demo") return;
      engine.update(createDemoHands(now - started), now);
      frames += 1;
      if (now - sampledAt >= 1000) {
        engine.setPerformance({ cameraFps: 0, inferenceFps: (frames * 1000) / (now - sampledAt), inferenceMs: 0, frameAgeMs: 0 });
        frames = 0;
        sampledAt = now;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const resetInput = () => {
    stop();
    changeMode("idle");
    setMessage("影像只在当前设备内识别，不展示、不上传");
  };

  useEffect(() => {
    const timer = window.setInterval(() => setState({ ...engine.state }), 100);
    return () => window.clearInterval(timer);
  }, [engine]);

  useEffect(() => () => stop(), []);

  const hand = state.rightHand ?? state.leftHand;
  const ready = mode === "camera" && Boolean(hand);

  return (
    <>
      <video className="hidden-camera" ref={videoRef} muted playsInline aria-hidden="true" />

      {mode === "idle" || mode === "error" ? (
        <section className="gesture-entry" aria-label="开启皮影手势">
          <span className="entry-chop" aria-hidden="true">启</span>
          <div>
            <p>让手成为操影杆</p>
            <h2>{mode === "error" ? "手势尚未启用" : "举手，皮影便有了生命"}</h2>
            <small>{message}</small>
          </div>
          <div className="entry-actions">
            <button className="entry-primary" onClick={startCamera}>开启手势</button>
            <button className="entry-secondary" onClick={startDemo}>观看演示</button>
          </div>
        </section>
      ) : (
        <button className={`calibration-toggle calibration-toggle--${mode}`} onClick={() => setPanelOpen((open) => !open)} aria-expanded={panelOpen}>
          <i /><span>{MODE_LABEL[mode]}</span><small>{panelOpen ? "收起校准" : "手部校准"}</small>
        </button>
      )}

      {panelOpen && (
        <aside className="calibration-panel" aria-label="手部校准">
          <div className="calibration-heading">
            <div><p>不显示摄像头画面</p><h2>手部校准</h2></div>
            <button onClick={() => setPanelOpen(false)} aria-label="关闭校准">×</button>
          </div>
          <div className={`calibration-figure ${ready ? "is-ready" : ""}`}>
            <CalibrationHand hand={hand} />
            <span>{mode === "loading" ? "正在识手" : hand ? "手部已在影窗中" : "将手置于画面中央"}</span>
          </div>
          <div className="calibration-checks">
            <p className={state.handsDetected > 0 ? "is-done" : ""}><i />看见掌心</p>
            <p className={(hand?.openness ?? 0) > .5 ? "is-done" : ""}><i />看见五指</p>
            <p className={state.confidence > .72 ? "is-done" : ""}><i />识别稳定</p>
          </div>
          <p className="calibration-message">{message}</p>
          <div className="calibration-meta">
            <span>识别强度 <b>{hand ? `${Math.round(state.confidence * 100)}%` : "—"}</b></span>
            <span>处理帧率 <b>{state.performance.inferenceFps ? `${Math.round(state.performance.inferenceFps)} FPS` : "—"}</b></span>
          </div>
          <button className="calibration-stop" onClick={resetInput}>停止手势识别</button>
        </aside>
      )}
    </>
  );
}
