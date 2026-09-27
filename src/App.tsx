import { useRef } from "react";
import { GestureInput } from "./components/GestureInput";
import { ShadowPlayground } from "./components/ShadowPlayground";
import { GestureEngine } from "./gesture/GestureEngine";

export default function App() {
  const engineRef = useRef<GestureEngine | null>(null);
  if (!engineRef.current) engineRef.current = new GestureEngine();
  const engine = engineRef.current;
  return (
    <>
      <ShadowPlayground engine={engine} />
      <GestureInput engine={engine} />
    </>
  );
}
