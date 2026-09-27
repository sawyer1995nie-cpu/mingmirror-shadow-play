import { useEffect, useRef, useState } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";

type CrushStage = "flat" | "folded" | "crumpled" | "particles";

export function PaperCrush({ engine }: { engine: GestureEngine }) {
  const [stage, setStage] = useState<CrushStage>("flat");
  const stageRef = useRef<CrushStage>("flat");
  const setCrushStage = (next: CrushStage) => { stageRef.current = next; setStage(next); };

  useEffect(() => {
    const offPinch = engine.on("pinch", ({ phase }) => {
      if (phase !== "start") return;
      if (stageRef.current === "flat") setCrushStage("folded");
      else if (stageRef.current === "folded") setCrushStage("crumpled");
      else if (stageRef.current === "crumpled") setCrushStage("particles");
    });
    const offFist = engine.on("fist", ({ phase }) => {
      if (phase === "start" && stageRef.current !== "flat") setCrushStage("particles");
    });
    return () => { offPinch(); offFist(); };
  }, [engine]);

  return (
    <div className={`scene scene--crush scene--crush-${stage}`}>
      <div className="scene-copy"><span>03 · PAPER CRUSH</span><p>Pinch to gather the sheet. Close into a fist to dissolve it.</p></div>
      <div className="crush-object" aria-label={`Paper is ${stage}`}>
        <div className="crush-sheet"><i /><b>解</b></div>
        <div className="crush-particles">
          {Array.from({ length: 28 }, (_, index) => <i key={index} style={{ "--particle": index } as React.CSSProperties} />)}
        </div>
      </div>
      <button className="scene-reset" onClick={() => setCrushStage("flat")}>Reset paper</button>
      <span className="scene-hint">FLAT → FOLDED → CRUMPLED → PARTICLES</span>
    </div>
  );
}
