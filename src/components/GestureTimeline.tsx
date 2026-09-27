import { useEffect, useRef, useState } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";

interface TimelineItem { id: number; label: string; time: number }

export function GestureTimeline({ engine }: { engine: GestureEngine }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const previous = useRef("IDLE");
  const id = useRef(0);

  useEffect(() => engine.on("change", ({ state, timestamp }) => {
    const label = state.phase;
    if (label !== previous.current && !label.endsWith("DETECTED")) {
      previous.current = label;
      setItems((current) => [...current, { id: ++id.current, label, time: timestamp }].slice(-5));
    }
  }), [engine]);

  return (
    <section className="timeline" aria-label="Gesture timeline">
      <div className="timeline__heading"><span>Gesture timeline</span><small>edge-triggered</small></div>
      <div className="timeline__track">
        {items.length === 0 && <span className="timeline__empty">Waiting for a gesture sequence</span>}
        {items.map((item, index) => (
          <div className="timeline__item" key={item.id}>
            {index > 0 && <i />}
            <span>{item.label.replaceAll("_", " ")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
