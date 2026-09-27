import { useEffect, useState } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";
import type { GestureState, HandState } from "../gesture/GestureState";

function HandReadout({ label, hand }: { label: string; hand: HandState | null }) {
  return (
    <div className="hand-readout">
      <div className="debug-row"><span>{label}</span><b>{hand ? "TRACKED" : "—"}</b></div>
      <div className="coordinate-row">
        <span>X&nbsp; {hand?.position.x.toFixed(2) ?? "—"}</span>
        <span>Y&nbsp; {hand?.position.y.toFixed(2) ?? "—"}</span>
        <span>Z&nbsp; {hand?.position.z.toFixed(2) ?? "—"}</span>
      </div>
      <div className="strength-track"><i style={{ width: `${(hand?.pinchStrength ?? 0) * 100}%` }} /></div>
    </div>
  );
}

export function GestureDebugPanel({ engine }: { engine: GestureEngine }) {
  const [state, setState] = useState<GestureState>({ ...engine.state });

  useEffect(() => {
    const timer = window.setInterval(() => setState({ ...engine.state }), 100);
    return () => window.clearInterval(timer);
  }, [engine]);

  return (
    <aside className="debug-panel" aria-label="Gesture engine telemetry">
      <div className="debug-panel__title">
        <div><p className="eyebrow">Runtime / 10 Hz UI</p><h2>Gesture engine</h2></div>
        <span className="engine-pulse" aria-label="Engine active" />
      </div>
      <div className="debug-row debug-row--strong"><span>Hands detected</span><b>{state.handsDetected}</b></div>
      <HandReadout label="LEFT HAND" hand={state.leftHand} />
      <HandReadout label="RIGHT HAND" hand={state.rightHand} />
      <div className="debug-block">
        <div className="debug-row"><span>Hand distance</span><b>{state.handDistance.toFixed(3)}</b></div>
        <div className="debug-row"><span>Palms together</span><b>{Math.round(state.palmsTogetherStrength * 100)}%</b></div>
      </div>
      <div className="signal-block">
        <span>Current gesture</span><strong>{state.currentGesture.replaceAll("_", " ")}</strong>
        <small>{state.phase.replaceAll("_", " ")}</small>
      </div>
      <div className="debug-block">
        <div className="debug-row"><span>Motion</span><b className="accent-value">{state.motion.replaceAll("_", " ")}</b></div>
        <div className="debug-row"><span>Confidence</span><b>{state.confidence.toFixed(2)}</b></div>
      </div>
      <div className="performance-grid">
        <div><span>CAM</span><b>{state.performance.cameraFps ? Math.round(state.performance.cameraFps) : "—"}</b><small>fps</small></div>
        <div><span>ENGINE</span><b>{Math.round(state.performance.inferenceFps)}</b><small>fps</small></div>
        <div><span>PROCESS</span><b>{state.performance.inferenceMs.toFixed(1)}</b><small>ms</small></div>
      </div>
    </aside>
  );
}
