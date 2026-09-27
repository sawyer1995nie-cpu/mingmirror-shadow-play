import { useEffect, useRef } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";
import { clamp, inverseLerp } from "../utils/math";

export function PaperUnfold({ engine }: { engine: GestureEngine }) {
  const paperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let progress = 0.08;
    const tick = () => {
      const target = engine.state.twoHandsDetected
        ? clamp(inverseLerp(0.1, 0.64, engine.state.handDistance))
        : 0.08;
      progress += (target - progress) * 0.12;
      paperRef.current?.style.setProperty("--unfold", progress.toFixed(3));
      if (stageRef.current) stageRef.current.dataset.open = progress > 0.88 ? "true" : "false";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  return (
    <div className="scene scene--paper" ref={stageRef}>
      <div className="scene-copy"><span>02 · PAPER UNFOLD</span><p>Bring both hands close, then pull them apart.</p></div>
      <div className="paper-shadow" />
      <div className="digital-paper" ref={paperRef}>
        <div className="paper-fold paper-fold--left"><i /></div>
        <div className="paper-fold paper-fold--center"><b>明</b><span>INNER WEATHER / 07</span></div>
        <div className="paper-fold paper-fold--right"><i /></div>
      </div>
      <span className="scene-hint">HAND DISTANCE → PAPER WIDTH</span>
    </div>
  );
}
