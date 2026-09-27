import { useEffect, useRef, useState } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";

type RitualStep = "door" | "paper" | "book" | "complete";

const INSTRUCTIONS: Record<RitualStep, { title: string; note: string; mark: string }> = {
  door: { title: "张开手掌，向前轻推", note: "让掌心靠近镜头，推开眼前的门", mark: "推" },
  paper: { title: "拇指与食指捏合", note: "捏住门后的命纸，停留片刻将它展开", mark: "捏" },
  book: { title: "五个指尖向掌心归拢", note: "让五指彼此相触，收束这次观照", mark: "合" },
  complete: { title: "观照已成", note: "你已完成一次明镜手势仪式", mark: "成" },
};

const GESTURE_NAMES: Record<string, string> = {
  NONE: "等待手势",
  OPEN_HAND: "已识别掌心",
  PINCH: "已捏住命纸",
  FIVE_FINGER_TOUCH: "五指已合",
  FIST: "手掌收拢",
  PALMS_TOGETHER: "双掌相合",
};

export function RitualJourney({ engine }: { engine: GestureEngine }) {
  const [step, setStep] = useState<RitualStep>("door");
  const [doorOpen, setDoorOpen] = useState(false);
  const [paperHeld, setPaperHeld] = useState(false);
  const [gestureLabel, setGestureLabel] = useState("等待手势");
  const stepRef = useRef<RitualStep>("door");
  const pinchHolds = useRef(0);
  const paperHeldRef = useRef(false);
  const timers = useRef<number[]>([]);

  const moveTo = (next: RitualStep) => {
    stepRef.current = next;
    setStep(next);
  };

  useEffect(() => {
    const offPush = engine.on("push", ({ phase }) => {
      if (phase !== "trigger" || stepRef.current !== "door") return;
      setDoorOpen(true);
      timers.current.push(window.setTimeout(() => moveTo("paper"), 1250));
    });
    const offPinch = engine.on("pinch", ({ phase }) => {
      if (stepRef.current !== "paper") return;
      if (phase === "start") {
        pinchHolds.current = 0;
        paperHeldRef.current = true;
        setPaperHeld(true);
      }
      if (phase === "hold") {
        pinchHolds.current += 1;
        if (pinchHolds.current >= 3) {
          paperHeldRef.current = false;
          setPaperHeld(false);
          moveTo("book");
        }
      }
      if (phase === "end" && paperHeldRef.current) {
        paperHeldRef.current = false;
        setPaperHeld(false);
        moveTo("book");
      }
    });
    const offComplete = engine.on("fiveFingerTouch", ({ phase }) => {
      if (phase === "start" && stepRef.current === "book") moveTo("complete");
    });
    const labelTimer = window.setInterval(() => {
      setGestureLabel(GESTURE_NAMES[engine.state.currentGesture] ?? engine.state.currentGesture);
    }, 120);
    return () => {
      offPush(); offPinch(); offComplete();
      window.clearInterval(labelTimer);
      timers.current.forEach(window.clearTimeout);
    };
  }, [engine]);

  const instruction = INSTRUCTIONS[step];

  return (
    <main className={`ritual-shell ritual-shell--${step}`} data-door-open={doorOpen}>
      <header className="ritual-header">
        <div className="ritual-brand"><span className="mirror-mark" aria-hidden="true"><i /><i /></span><b>明镜</b><small>MINGMIRROR</small></div>
        <ol className="ritual-progress" aria-label="仪式进度">
          <li className={step === "door" ? "is-current" : doorOpen ? "is-done" : ""}><span>壹</span><small>开门</small></li>
          <li className={step === "paper" || step === "book" ? "is-current" : step === "complete" ? "is-done" : ""}><span>贰</span><small>见书</small></li>
          <li className={step === "complete" ? "is-current" : ""}><span>叁</span><small>合指</small></li>
        </ol>
        <div className="local-mark"><i /> 本机识别</div>
      </header>

      <section className="ritual-stage" aria-live="polite">
        <div className="distant-moon" aria-hidden="true" />
        <div className="mountain-layer mountain-layer--back" aria-hidden="true" />
        <div className="mountain-layer mountain-layer--front" aria-hidden="true" />
        <div className="gate-halo" aria-hidden="true" />

        <div className="eastern-gate" aria-label={doorOpen ? "东方门已经打开" : "一扇等待推开的东方门"}>
          <div className="gate-roof"><i /><b>明镜之门</b><i /></div>
          <div className="gate-pillar gate-pillar--left"><i /></div>
          <div className="gate-pillar gate-pillar--right"><i /></div>
          <div className="inner-court">
            <span className="court-moon" /><span className="court-path" />
          </div>
          <div className="lacquer-door lacquer-door--left"><span className="door-studs" /><i className="door-ring" /></div>
          <div className="lacquer-door lacquer-door--right"><span className="door-studs" /><i className="door-ring" /></div>
        </div>

        <article className={`fate-paper ${paperHeld ? "is-held" : ""}`} aria-hidden={step === "door"}>
          <div className="paper-wing paper-wing--left"><span /></div>
          <div className="paper-leaf">
            <span className="paper-seal">命</span>
            <div className="book-content">
              <p className="book-overline">明镜 · 内在观照</p>
              <h1>命书</h1>
              <p className="book-lead">观其势，知其性。照见反复出现的模式，便多一种选择。</p>
              <div className="book-columns">
                <section><span>五行气象</span><b>水木相生</b><p>感受细腻，向内生长，也需要清晰的边界。</p></section>
                <section><span>内在镜像</span><b>静中见明</b><p>答案并非来自预言，而来自对自身节律的理解。</p></section>
              </div>
            </div>
          </div>
          <div className="paper-wing paper-wing--right"><span /></div>
        </article>

        <div className="completion-seal" aria-hidden={step !== "complete"}>
          <i /><span>成</span><small>观照不止于答案<br />而始于选择</small>
        </div>
      </section>

      <section className="gesture-guidance">
        <div className={`gesture-symbol gesture-symbol--${step}`} aria-hidden="true">
          <span>{instruction.mark}</span>
          {step === "book" && <div className="finger-dots"><i /><i /><i /><i /><i /></div>}
        </div>
        <div>
          <p className="guidance-step">{step === "door" ? "第一式" : step === "paper" ? "第二式" : step === "book" ? "第三式" : "仪式完成"}</p>
          <h2>{instruction.title}</h2>
          <p>{instruction.note}</p>
        </div>
        <div className="gesture-readout"><i /><span>{gestureLabel}</span></div>
        {step === "complete" && <button className="restart-button" onClick={() => window.location.reload()}>重新开始</button>}
      </section>
    </main>
  );
}
