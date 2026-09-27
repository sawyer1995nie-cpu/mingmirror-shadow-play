import { useEffect, useRef } from "react";
import type { GestureEngine } from "../gesture/GestureEngine";
import type { HandState, Handedness } from "../gesture/GestureState";

const ART = "/assets/shadow-puppet-hero-v1.png";
const TIP_INDICES = [4, 8, 12, 16, 20] as const;
const FINGER_LABELS = ["拇", "食", "中", "无", "小"];
const MARKER_LANES = [
  { x: 292, y: 250 },
  { x: 402, y: 170 },
  { x: 512, y: 125 },
  { x: 622, y: 165 },
  { x: 732, y: 235 },
] as const;

interface Point { x: number; y: number }
interface Baseline { handedness: Handedness; points: Point[] }

const JOINTS = {
  leftShoulder: { x: 440, y: 423 },
  leftElbow: { x: 239, y: 514 },
  leftWrist: { x: 105, y: 401 },
  rightShoulder: { x: 641, y: 423 },
  rightElbow: { x: 798, y: 584 },
  rightWrist: { x: 909, y: 699 },
  crown: { x: 494, y: 28 },
  neck: { x: 541, y: 357 },
  leftKnee: { x: 366, y: 1094 },
  leftAnkle: { x: 324, y: 1395 },
  rightKnee: { x: 708, y: 1094 },
  rightAnkle: { x: 768, y: 1392 },
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
const normalizeAngle = (degrees: number) => ((degrees + 540) % 360) - 180;

function mirroredPoint(hand: HandState, index: number): Point {
  const point = hand.landmarks[index];
  return { x: 1 - point.x, y: point.y };
}

function relativeTips(hand: HandState) {
  return TIP_INDICES.map((index) => {
    const point = mirroredPoint(hand, index);
    return { x: point.x - hand.position.x, y: point.y - hand.position.y };
  });
}

function solveTwoBone(base: Point, target: Point, firstLength: number, secondLength: number) {
  const dx = target.x - base.x;
  const dy = target.y - base.y;
  const rawDistance = Math.hypot(dx, dy);
  const reach = clamp(rawDistance, Math.abs(firstLength - secondLength) + .1, firstLength + secondLength - .1);
  const targetAngle = Math.atan2(dy, dx);
  const shoulderOffset = Math.acos(clamp((firstLength ** 2 + reach ** 2 - secondLength ** 2) / (2 * firstLength * reach), -1, 1));
  const elbowInner = Math.acos(clamp((firstLength ** 2 + secondLength ** 2 - reach ** 2) / (2 * firstLength * secondLength), -1, 1));
  return {
    first: (targetAngle - shoulderOffset) * 180 / Math.PI,
    second: (Math.PI - elbowInner) * 180 / Math.PI,
  };
}

const LEFT_ARM = {
  firstLength: distance(JOINTS.leftShoulder, JOINTS.leftElbow),
  secondLength: distance(JOINTS.leftElbow, JOINTS.leftWrist),
  firstAngle: angle(JOINTS.leftShoulder, JOINTS.leftElbow),
  secondAngle: normalizeAngle(angle(JOINTS.leftElbow, JOINTS.leftWrist) - angle(JOINTS.leftShoulder, JOINTS.leftElbow)),
};
const RIGHT_ARM = {
  firstLength: distance(JOINTS.rightShoulder, JOINTS.rightElbow),
  secondLength: distance(JOINTS.rightElbow, JOINTS.rightWrist),
  firstAngle: angle(JOINTS.rightShoulder, JOINTS.rightElbow),
  secondAngle: normalizeAngle(angle(JOINTS.rightElbow, JOINTS.rightWrist) - angle(JOINTS.rightShoulder, JOINTS.rightElbow)),
};

export function ShadowPuppet({ engine }: { engine: GestureEngine }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rigRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const leftUpperArmRef = useRef<SVGGElement>(null);
  const leftForearmRef = useRef<SVGGElement>(null);
  const rightUpperArmRef = useRef<SVGGElement>(null);
  const rightForearmRef = useRef<SVGGElement>(null);
  const leftLegRef = useRef<SVGGElement>(null);
  const rightLegRef = useRef<SVGGElement>(null);
  const baselineRef = useRef<Baseline | null>(null);

  useEffect(() => engine.on("change", ({ state }) => {
    const hand = state.rightHand ?? state.leftHand;
    const svg = svgRef.current;
    const rig = rigRef.current;
    if (!svg || !rig) return;

    if (!hand) {
      svg.dataset.tracked = "false";
      baselineRef.current = null;
      return;
    }

    const tips = relativeTips(hand);
    if (!baselineRef.current || baselineRef.current.handedness !== hand.handedness) {
      baselineRef.current = { handedness: hand.handedness, points: tips.map((point) => ({ ...point })) };
    }
    const baseline = baselineRef.current.points;
    const scale = Math.max(hand.palmScale, .075);
    const delta = tips.map((point, index) => ({
      x: clamp((point.x - baseline[index].x) / scale, -1.25, 1.25),
      y: clamp((point.y - baseline[index].y) / scale, -1.25, 1.25),
    }));

    const rootX = clamp((hand.position.x - .5) * 210, -105, 105);
    const rootY = clamp((hand.position.y - .5) * 150, -70, 82);
    const leftWristTarget = {
      x: JOINTS.leftWrist.x + delta[0].x * 320,
      y: JOINTS.leftWrist.y + delta[0].y * 320,
    };
    const leftAnkleTarget = {
      x: JOINTS.leftAnkle.x + delta[1].x * 220,
      y: JOINTS.leftAnkle.y + delta[1].y * 200,
    };
    const crownTarget = {
      x: JOINTS.crown.x + delta[2].x * 210,
      y: JOINTS.crown.y + delta[2].y * 180,
    };
    const rightAnkleTarget = {
      x: JOINTS.rightAnkle.x + delta[3].x * 220,
      y: JOINTS.rightAnkle.y + delta[3].y * 200,
    };
    const rightWristTarget = {
      x: JOINTS.rightWrist.x + delta[4].x * 320,
      y: JOINTS.rightWrist.y + delta[4].y * 320,
    };

    const leftArm = solveTwoBone(JOINTS.leftShoulder, leftWristTarget, LEFT_ARM.firstLength, LEFT_ARM.secondLength);
    const rightArm = solveTwoBone(JOINTS.rightShoulder, rightWristTarget, RIGHT_ARM.firstLength, RIGHT_ARM.secondLength);
    const leftLegRotation = normalizeAngle(angle(JOINTS.leftKnee, leftAnkleTarget) - angle(JOINTS.leftKnee, JOINTS.leftAnkle));
    const rightLegRotation = normalizeAngle(angle(JOINTS.rightKnee, rightAnkleTarget) - angle(JOINTS.rightKnee, JOINTS.rightAnkle));
    const headRotation = clamp(delta[2].x * 22, -24, 24);
    const headLift = clamp(delta[2].y * 80, -70, 70);

    svg.dataset.tracked = "true";
    rig.setAttribute("transform", `translate(${rootX} ${rootY})`);
    leftUpperArmRef.current?.setAttribute("transform", `rotate(${normalizeAngle(leftArm.first - LEFT_ARM.firstAngle)} ${JOINTS.leftShoulder.x} ${JOINTS.leftShoulder.y})`);
    leftForearmRef.current?.setAttribute("transform", `rotate(${normalizeAngle(leftArm.second - LEFT_ARM.secondAngle)} ${JOINTS.leftElbow.x} ${JOINTS.leftElbow.y})`);
    rightUpperArmRef.current?.setAttribute("transform", `rotate(${normalizeAngle(rightArm.first - RIGHT_ARM.firstAngle)} ${JOINTS.rightShoulder.x} ${JOINTS.rightShoulder.y})`);
    rightForearmRef.current?.setAttribute("transform", `rotate(${normalizeAngle(rightArm.second - RIGHT_ARM.secondAngle)} ${JOINTS.rightElbow.x} ${JOINTS.rightElbow.y})`);
    leftLegRef.current?.setAttribute("transform", `rotate(${clamp(leftLegRotation, -34, 34)} ${JOINTS.leftKnee.x} ${JOINTS.leftKnee.y})`);
    rightLegRef.current?.setAttribute("transform", `rotate(${clamp(rightLegRotation, -34, 34)} ${JOINTS.rightKnee.x} ${JOINTS.rightKnee.y})`);
    headRef.current?.setAttribute("transform", `translate(0 ${headLift}) rotate(${headRotation} ${JOINTS.neck.x} ${JOINTS.neck.y})`);

    const endpoints = [leftWristTarget, leftAnkleTarget, crownTarget, rightAnkleTarget, rightWristTarget];
    const lines = svg.querySelectorAll<SVGLineElement>("[data-control-line]");
    const markers = svg.querySelectorAll<SVGGElement>("[data-finger-marker]");
    TIP_INDICES.forEach((_, index) => {
      const lane = MARKER_LANES[index];
      const markerX = lane.x + clamp(delta[index].x * 42, -34, 34);
      const markerY = lane.y + clamp(delta[index].y * 55, -42, 42);
      const end = endpoints[index];
      lines[index]?.setAttribute("x1", String(markerX));
      lines[index]?.setAttribute("y1", String(markerY));
      lines[index]?.setAttribute("x2", String(end.x + rootX));
      lines[index]?.setAttribute("y2", String(end.y + rootY));
      markers[index]?.setAttribute("transform", `translate(${markerX} ${markerY})`);
    });
  }), [engine]);

  return (
    <svg ref={svgRef} className="shadow-puppet shadow-puppet--image" viewBox="0 0 1024 1536" role="img" aria-label="五个指尖分别牵动头顶、双腕与双踝的中国皮影" data-tracked="false">
      <defs>
        <clipPath id="puppet-head"><path d="M300 0H705V395L616 445H396L300 382Z" /></clipPath>
        <clipPath id="puppet-body"><path d="M394 325 520 350 650 326 704 372 708 540 744 640 880 1040 695 1144 616 1075 531 1280 440 1084 185 1094 286 755 340 555Z" /></clipPath>
        <clipPath id="puppet-left-upper"><path d="M225 335 466 344 482 476 316 616 182 579 170 460Z" /></clipPath>
        <clipPath id="puppet-left-lower"><path d="M0 250 286 295 310 558 181 637 0 470Z" /></clipPath>
        <clipPath id="puppet-right-upper"><path d="M606 342 790 350 866 560 780 664 623 512Z" /></clipPath>
        <clipPath id="puppet-right-lower"><path d="M748 500 1024 548 1024 803 875 774 746 648Z" /></clipPath>
        <clipPath id="puppet-left-leg"><path d="M150 1000 510 985 530 1536 100 1536Z" /></clipPath>
        <clipPath id="puppet-right-leg"><path d="M548 990 905 1002 965 1536 515 1536Z" /></clipPath>
        <filter id="imagePuppetShadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="24" stdDeviation="18" floodColor="#31110b" floodOpacity=".5" />
        </filter>
      </defs>

      <g ref={rigRef} className="image-puppet-rig" filter="url(#imagePuppetShadow)">
        <image className="puppet-layer puppet-layer--body" href={ART} width="1024" height="1536" clipPath="url(#puppet-body)" />

        <g ref={leftLegRef} className="puppet-joint-layer">
          <image className="puppet-layer" href={ART} width="1024" height="1536" clipPath="url(#puppet-left-leg)" />
        </g>
        <g ref={rightLegRef} className="puppet-joint-layer">
          <image className="puppet-layer" href={ART} width="1024" height="1536" clipPath="url(#puppet-right-leg)" />
        </g>

        <g ref={leftUpperArmRef} className="puppet-joint-layer">
          <image className="puppet-layer" href={ART} width="1024" height="1536" clipPath="url(#puppet-left-upper)" />
          <g ref={leftForearmRef} className="puppet-joint-layer">
            <image className="puppet-layer" href={ART} width="1024" height="1536" clipPath="url(#puppet-left-lower)" />
          </g>
        </g>
        <g ref={rightUpperArmRef} className="puppet-joint-layer">
          <image className="puppet-layer" href={ART} width="1024" height="1536" clipPath="url(#puppet-right-upper)" />
          <g ref={rightForearmRef} className="puppet-joint-layer">
            <image className="puppet-layer" href={ART} width="1024" height="1536" clipPath="url(#puppet-right-lower)" />
          </g>
        </g>

        <g ref={headRef} className="puppet-joint-layer">
          <image className="puppet-layer" href={ART} width="1024" height="1536" clipPath="url(#puppet-head)" />
        </g>
      </g>

      <g className="finger-control-overlay" aria-hidden="true">
        {FINGER_LABELS.map((label, index) => (
          <g key={label} className={`finger-control finger-control--${index}`}>
            <line data-control-line x1={MARKER_LANES[index].x} y1={MARKER_LANES[index].y} x2={[105, 324, 494, 768, 909][index]} y2={[401, 1395, 28, 1392, 699][index]} />
            <g data-finger-marker transform={`translate(${MARKER_LANES[index].x} ${MARKER_LANES[index].y})`}>
              <circle r="18" /><circle className="finger-control__core" r="5" /><text y="-27">{label}</text>
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}
