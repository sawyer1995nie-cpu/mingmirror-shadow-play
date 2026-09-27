import { describe, expect, it, vi } from "vitest";
import { GestureEngine } from "../src/gesture/GestureEngine";
import { createDemoHands, createRitualDemoHands } from "../src/utils/demoHands";

describe("GestureEngine", () => {
  it("recognizes normalized pinch and emits one start edge", () => {
    const engine = new GestureEngine();
    const listener = vi.fn();
    engine.on("pinch", listener);

    engine.update(createDemoHands(2200), 2200);
    engine.update(createDemoHands(2300), 2300);
    engine.update(createDemoHands(2400), 2400);

    expect(engine.state.currentGesture).toBe("PINCH");
    expect(engine.state.rightHand?.pinchStrength).toBeGreaterThan(0.78);
    expect(listener.mock.calls.filter(([event]) => event.phase === "start")).toHaveLength(1);
  });

  it("returns to IDLE after hands disappear", () => {
    const engine = new GestureEngine();
    engine.update(createDemoHands(1000), 1000);
    expect(engine.state.handsDetected).toBe(1);
    engine.update([], 1600);
    expect(engine.state.handsDetected).toBe(0);
    expect(engine.state.phase).toBe("IDLE");
  });

  it("detects a two-hand pull-apart motion from a rolling window", () => {
    const engine = new GestureEngine();
    let triggered = false;
    engine.on("pullApart", () => { triggered = true; });

    for (let elapsed = 7000; elapsed <= 7900; elapsed += 100) {
      engine.update(createDemoHands(elapsed), elapsed);
    }

    expect(triggered).toBe(true);
  });

  it("keeps scene-facing hand positions normalized", () => {
    const engine = new GestureEngine();
    engine.update(createDemoHands(1000), 1000);
    const hand = engine.state.rightHand;
    expect(hand).not.toBeNull();
    expect(hand!.position.x).toBeGreaterThanOrEqual(0);
    expect(hand!.position.x).toBeLessThanOrEqual(1);
    expect(hand!.position.y).toBeGreaterThanOrEqual(0);
    expect(hand!.position.y).toBeLessThanOrEqual(1);
  });

  it("detects open-palm approach as PUSH", () => {
    const engine = new GestureEngine();
    let triggered = false;
    engine.on("push", () => { triggered = true; });
    for (let elapsed = 12200; elapsed <= 13200; elapsed += 100) {
      engine.update(createDemoHands(elapsed), elapsed);
    }
    expect(triggered).toBe(true);
  });

  it("does not carry depth history across a two-hand to pinch transition", () => {
    const engine = new GestureEngine();
    const push = vi.fn();
    engine.on("push", push);
    engine.update(createDemoHands(8800), 8800);
    engine.update(createDemoHands(8900), 8900);
    engine.update(createDemoHands(9000), 9000);
    engine.update(createDemoHands(9100), 9100);
    engine.update(createDemoHands(9200), 9200);
    expect(push).not.toHaveBeenCalled();
  });

  it("recognizes all five fingertips gathering at one point", () => {
    const engine = new GestureEngine();
    const completion = vi.fn();
    engine.on("fiveFingerTouch", completion);
    engine.update(createRitualDemoHands(7600), 7600);
    engine.update(createRitualDemoHands(7700), 7700);
    expect(engine.state.currentGesture).toBe("FIVE_FINGER_TOUCH");
    expect(engine.state.rightHand?.fingerGatherStrength).toBeGreaterThan(0.78);
    expect(completion.mock.calls.filter(([event]) => event.phase === "start")).toHaveLength(1);
  });
});
