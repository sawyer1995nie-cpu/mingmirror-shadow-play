import type { GestureEngine } from "../gesture/GestureEngine";
import { PinchOrb } from "../scenes/PinchOrb";
import { PaperUnfold } from "../scenes/PaperUnfold";
import { PaperCrush } from "../scenes/PaperCrush";
import { DigitalDoor } from "../scenes/DigitalDoor";

const SCENES = [
  { id: "orb", label: "Pinch orb", gesture: "PINCH" },
  { id: "unfold", label: "Paper unfold", gesture: "PULL APART" },
  { id: "crush", label: "Paper crush", gesture: "PINCH + FIST" },
  { id: "door", label: "Digital door", gesture: "PUSH" },
] as const;

export type SceneId = typeof SCENES[number]["id"];

export function SceneDeck({ engine, active, onChange }: { engine: GestureEngine; active: SceneId; onChange: (scene: SceneId) => void }) {
  return (
    <section className="scene-deck" aria-label="Interaction prototypes">
      <nav className="scene-tabs" aria-label="Choose interaction prototype">
        {SCENES.map((scene, index) => (
          <button key={scene.id} className={scene.id === active ? "is-active" : ""} onClick={() => onChange(scene.id)}>
            <span>0{index + 1}</span><b>{scene.label}</b><small>{scene.gesture}</small>
          </button>
        ))}
      </nav>
      <div className="scene-viewport">
        {active === "orb" && <PinchOrb engine={engine} />}
        {active === "unfold" && <PaperUnfold engine={engine} />}
        {active === "crush" && <PaperCrush engine={engine} />}
        {active === "door" && <DigitalDoor engine={engine} />}
      </div>
    </section>
  );
}
