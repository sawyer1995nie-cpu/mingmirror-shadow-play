import { useEffect, useState } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";

export function DigitalDoor({ engine }: { engine: GestureEngine }) {
  const [open, setOpen] = useState(false);
  useEffect(() => engine.on("push", ({ phase }) => {
    if (phase === "trigger") setOpen(true);
  }), [engine]);

  return (
    <div className={`scene scene--door ${open ? "is-open" : ""}`}>
      <div className="scene-copy"><span>04 · DIGITAL DOOR</span><p>Show an open palm, then move it toward the camera.</p></div>
      <div className="door-world"><i /><i /><i /></div>
      <div className="door-frame">
        <span className="door-frame__top" />
        <div className="door-panel door-panel--left"><i /></div>
        <div className="door-panel door-panel--right"><i /></div>
      </div>
      <button className="scene-reset" onClick={() => setOpen(false)}>Close door</button>
      <span className="scene-hint">OPEN HAND + FORWARD SCALE → PUSH</span>
    </div>
  );
}
