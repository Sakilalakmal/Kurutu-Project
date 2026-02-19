export type NodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SnapGuides = {
  x?: number;
  y?: number;
};

type XPointKind = "left" | "centerX" | "right";
type YPointKind = "top" | "centerY" | "bottom";

type XTarget = {
  kind: XPointKind;
  value: number;
};

type YTarget = {
  kind: YPointKind;
  value: number;
};

export type SnapTargets = {
  xTargets: XTarget[];
  yTargets: YTarget[];
};

export type ComputeSnapResult = {
  snappedPosition: { x: number; y: number };
  guides: SnapGuides;
  snappedX: boolean;
  snappedY: boolean;
};

const isFinitePositive = (value: number) => Number.isFinite(value) && value > 0;

const findClosestXTarget = (
  kind: XPointKind,
  candidateValue: number,
  targets: XTarget[],
  threshold: number
) => {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestValue: number | null = null;

  for (const target of targets) {
    if (target.kind !== kind) {
      continue;
    }

    const distance = Math.abs(target.value - candidateValue);

    if (distance > threshold || distance >= bestDistance) {
      continue;
    }

    bestDistance = distance;
    bestValue = target.value;
  }

  return bestValue;
};

const findClosestYTarget = (
  kind: YPointKind,
  candidateValue: number,
  targets: YTarget[],
  threshold: number
) => {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestValue: number | null = null;

  for (const target of targets) {
    if (target.kind !== kind) {
      continue;
    }

    const distance = Math.abs(target.value - candidateValue);

    if (distance > threshold || distance >= bestDistance) {
      continue;
    }

    bestDistance = distance;
    bestValue = target.value;
  }

  return bestValue;
};

export const buildSnapTargets = (nodes: NodeRect[]): SnapTargets => {
  const xTargets: XTarget[] = [];
  const yTargets: YTarget[] = [];

  for (const node of nodes) {
    if (!isFinitePositive(node.width) || !isFinitePositive(node.height)) {
      continue;
    }

    xTargets.push({ kind: "left", value: node.x });
    xTargets.push({ kind: "centerX", value: node.x + node.width / 2 });
    xTargets.push({ kind: "right", value: node.x + node.width });

    yTargets.push({ kind: "top", value: node.y });
    yTargets.push({ kind: "centerY", value: node.y + node.height / 2 });
    yTargets.push({ kind: "bottom", value: node.y + node.height });
  }

  return { xTargets, yTargets };
};

export const computeSnap = (
  position: { x: number; y: number },
  draggingNodeRect: NodeRect,
  targets: SnapTargets,
  threshold = 6
): ComputeSnapResult => {
  const width = draggingNodeRect.width;
  const height = draggingNodeRect.height;
  const constrainedThreshold = Math.max(threshold, 0);

  let snappedXValue: number | null = null;
  let snappedYValue: number | null = null;
  let guideX: number | undefined;
  let guideY: number | undefined;

  const left = position.x;
  const centerX = position.x + width / 2;
  const right = position.x + width;

  const top = position.y;
  const centerY = position.y + height / 2;
  const bottom = position.y + height;

  const leftTarget = findClosestXTarget("left", left, targets.xTargets, constrainedThreshold);
  const centerXTarget = findClosestXTarget(
    "centerX",
    centerX,
    targets.xTargets,
    constrainedThreshold
  );
  const rightTarget = findClosestXTarget("right", right, targets.xTargets, constrainedThreshold);

  const xCandidates = [
    {
      distance: leftTarget === null ? Number.POSITIVE_INFINITY : Math.abs(leftTarget - left),
      snappedPosition: leftTarget === null ? null : leftTarget,
      guide: leftTarget ?? undefined,
    },
    {
      distance:
        centerXTarget === null ? Number.POSITIVE_INFINITY : Math.abs(centerXTarget - centerX),
      snappedPosition: centerXTarget === null ? null : centerXTarget - width / 2,
      guide: centerXTarget ?? undefined,
    },
    {
      distance: rightTarget === null ? Number.POSITIVE_INFINITY : Math.abs(rightTarget - right),
      snappedPosition: rightTarget === null ? null : rightTarget - width,
      guide: rightTarget ?? undefined,
    },
  ];

  const bestX = xCandidates.reduce((best, candidate) =>
    candidate.distance < best.distance ? candidate : best
  );

  if (bestX.snappedPosition !== null && Number.isFinite(bestX.distance)) {
    snappedXValue = bestX.snappedPosition;
    guideX = bestX.guide;
  }

  const topTarget = findClosestYTarget("top", top, targets.yTargets, constrainedThreshold);
  const centerYTarget = findClosestYTarget(
    "centerY",
    centerY,
    targets.yTargets,
    constrainedThreshold
  );
  const bottomTarget = findClosestYTarget(
    "bottom",
    bottom,
    targets.yTargets,
    constrainedThreshold
  );

  const yCandidates = [
    {
      distance: topTarget === null ? Number.POSITIVE_INFINITY : Math.abs(topTarget - top),
      snappedPosition: topTarget === null ? null : topTarget,
      guide: topTarget ?? undefined,
    },
    {
      distance:
        centerYTarget === null ? Number.POSITIVE_INFINITY : Math.abs(centerYTarget - centerY),
      snappedPosition: centerYTarget === null ? null : centerYTarget - height / 2,
      guide: centerYTarget ?? undefined,
    },
    {
      distance: bottomTarget === null ? Number.POSITIVE_INFINITY : Math.abs(bottomTarget - bottom),
      snappedPosition: bottomTarget === null ? null : bottomTarget - height,
      guide: bottomTarget ?? undefined,
    },
  ];

  const bestY = yCandidates.reduce((best, candidate) =>
    candidate.distance < best.distance ? candidate : best
  );

  if (bestY.snappedPosition !== null && Number.isFinite(bestY.distance)) {
    snappedYValue = bestY.snappedPosition;
    guideY = bestY.guide;
  }

  return {
    snappedPosition: {
      x: snappedXValue ?? position.x,
      y: snappedYValue ?? position.y,
    },
    guides: {
      x: guideX,
      y: guideY,
    },
    snappedX: snappedXValue !== null,
    snappedY: snappedYValue !== null,
  };
};
