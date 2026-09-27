import { useEffect, useRef } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";

export function PinchOrb({ engine }: { engine: GestureEngine }) {
  const orbRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let x = 0.5;
    let y = 0.5;
    const tick = () => {
      const orb = orbRef.current;
      const stage = stageRef.current;
      if (orb && stage) {
        const { leftHand, rightHand } = engine.state;
        const hand = (leftHand?.pinchStrength ?? 0) > (rightHand?.pinchStrength ?? 0) ? leftHand : rightHand;
        const strength = hand?.pinchStrength ?? 0;
        if (hand && strength > 0.25) {
          const attraction = 0.04 + strength * 0.2;
          x += (hand.position.x - x) * attraction;
          y += (hand.position.y - y) * attraction;
        }
        orb.style.setProperty("--orb-x", `${x * 100}%`);
        orb.style.setProperty("--orb-y", `${y * 100}%`);
        orb.style.setProperty("--pinch", strength.toFixed(3));
        stage.dataset.grabbed = strength > 0.72 ? "true" : "false";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  return (
    <div className="scene scene--orb" ref={stageRef}>
      <div className="scene-copy"><span>01 · PINCH</span><p>Close thumb and index finger to hold the pearl.</p></div>
      <div className="orbit-line orbit-line--one" /><div className="orbit-line orbit-line--two" />
      <div className="gesture-orb" ref={orbRef}>
        <i className="gesture-orb__core" />
        {Array.from({ length: 12 }, (_, index) => <i className="orb-particle" key={index} style={{ "--particle": index } as React.CSSProperties} />)}
      </div>
      <span className="scene-hint">PINCH · HOLD · MOVE · RELEASE</span>
    </div>
  );
}
