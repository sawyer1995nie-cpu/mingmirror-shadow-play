import { useEffect, useState } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";
import type { GestureState } from "../gesture/GestureState";
import { ShadowPuppet } from "./ShadowPuppet";

const GESTURE_LABELS: Record<string, string> = {
  NONE: "静候入戏",
  OPEN_HAND: "掌心已见",
  FIST: "收势",
  PINCH: "捏合执物",
  FIVE_FINGER_TOUCH: "五指归一",
  PALMS_TOGETHER: "双掌相合",
};

const MOTION_LABELS: Record<string, string> = {
  NONE: "跟随中",
  MOVE_LEFT: "向左游移",
  MOVE_RIGHT: "向右游移",
  PULL_APART: "双手开幕",
  PUSH: "向前推近",
  PULL: "向后收回",
  HANDS_APPROACH: "双手靠近",
};

export function ShadowPlayground({ engine }: { engine: GestureEngine }) {
  const [state, setState] = useState<GestureState>({ ...engine.state });

  useEffect(() => {
    const timer = window.setInterval(() => setState({ ...engine.state }), 100);
    return () => window.clearInterval(timer);
  }, [engine]);

  const activeHand = state.rightHand ?? state.leftHand;
  const tracking = state.handsDetected > 0;

  return (
    <main className={`shadow-shell ${tracking ? "is-tracking" : ""}`}>
      <div className="paper-grain" aria-hidden="true" />
      <header className="shadow-header">
        <div className="shadow-brand">
          <span className="brand-seal" aria-hidden="true">影</span>
          <div><b>明镜 · 影戏</b><small>MINGMIRROR SHADOW PLAY</small></div>
        </div>
        <p className="header-instruction"><i />举手入戏，五指牵影</p>
        <div className="privacy-note"><i />本机识别 · 影像不展示</div>
      </header>

      <section className="shadow-layout">
        <aside className="story-panel" aria-label="皮影戏介绍">
          <p className="section-mark">一灯 · 一幕 · 一双手</p>
          <h1>掌中有戏<br />影里有人间</h1>
          <p className="story-lead">皮影以兽皮或纸张雕镂人物，在灯火与幕布之间，由艺人操杆赋予关节生命。</p>
          <div className="story-fact">
            <span>壹</span><p><b>十二至二十四处</b><small>传统皮影常见的活动关节</small></p>
          </div>
          <div className="story-fact">
            <span>贰</span><p><b>光、影、唱、动</b><small>在一方白幕里共同成戏</small></p>
          </div>
          <p className="story-footnote">此处以五指代替操杆，让你的动作成为皮影的一部分。</p>
        </aside>

        <section className="shadow-stage-wrap" aria-label="手势皮影舞台">
          <div className="stage-title">
            <span>影窗</span><small>{tracking ? "你的手正在牵动皮影" : "等待一双手进入灯下"}</small>
          </div>
          <div className="shadow-stage">
            <div className="stage-lamp" aria-hidden="true" />
            <div className="cloud cloud--one" aria-hidden="true" />
            <div className="cloud cloud--two" aria-hidden="true" />
            <div className="stage-mountain stage-mountain--back" aria-hidden="true" />
            <div className="stage-mountain stage-mountain--front" aria-hidden="true" />
            <div className="curtain curtain--left" aria-hidden="true" />
            <div className="curtain curtain--right" aria-hidden="true" />
            <div className="stage-border" aria-hidden="true" />
            <ShadowPuppet engine={engine} />
            <div className={`tracking-orbit ${tracking ? "is-live" : ""}`} aria-hidden="true"><i /><i /><i /><i /><i /></div>
            {!tracking && (
              <div className="stage-empty">
                <span className="empty-palm" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                <p>开启手势后，将一只手置于屏幕中央</p>
              </div>
            )}
          </div>
          <div className="stage-caption"><span>灯在幕后</span><i /><span>影在幕前</span><i /><span>手在戏中</span></div>
        </section>

        <aside className="guide-panel" aria-label="手势操作说明">
          <div className="live-readout">
            <p>当前动作</p>
            <strong>{GESTURE_LABELS[state.currentGesture] ?? state.currentGesture}</strong>
            <span><i className={tracking ? "is-on" : ""} />{MOTION_LABELS[state.motion] ?? state.motion}</span>
          </div>

          <div className={`finger-map ${activeHand && activeHand.openness > .42 ? "is-active" : ""}`}>
            <p>五指操影谱</p>
            <ul>
              <li><i className="finger-dot finger-dot--thumb" /><span>拇指</span><b>左腕</b></li>
              <li><i className="finger-dot finger-dot--index" /><span>食指</span><b>左踝</b></li>
              <li><i className="finger-dot finger-dot--middle" /><span>中指</span><b>冠顶</b></li>
              <li><i className="finger-dot finger-dot--ring" /><span>无名指</span><b>右踝</b></li>
              <li><i className="finger-dot finger-dot--little" /><span>小指</span><b>右腕</b></li>
            </ul>
            <small>掌心移动整尊皮影，五指只牵对应关节</small>
          </div>

          <div className="signal-meter">
            <div><span>掌心</span><b>{tracking ? `${Math.round(state.confidence * 100)}%` : "—"}</b></div>
            <div className="meter-track"><i style={{ width: `${state.confidence * 100}%` }} /></div>
            <div><span>捏合</span><b>{activeHand ? `${Math.round(activeHand.pinchStrength * 100)}%` : "—"}</b></div>
            <div className="meter-track meter-track--pinch"><i style={{ width: `${(activeHand?.pinchStrength ?? 0) * 100}%` }} /></div>
          </div>
        </aside>
      </section>

      <footer className="shadow-footer">
        <p><span>手势谱</span>掌心定身 · 五指对应 · 操线可见</p>
        <div className="gesture-ticks" aria-hidden="true">{Array.from({ length: 19 }, (_, index) => <i key={index} className={index < Math.round(state.confidence * 19) ? "is-lit" : ""} />)}</div>
        <p className="footer-state"><i className={tracking ? "is-on" : ""} />{tracking ? `${state.handsDetected} 只手已入戏` : "尚未识别手势"}</p>
      </footer>
    </main>
  );
}
