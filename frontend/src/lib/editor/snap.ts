export type SnapRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SnapGuides = {
  x?: number;
  y?: number;
};

export type SnapCandidates = {
  xPoints: number[];
  yPoints: number[];
};

export type ResizeXAxisMode = "drag" | "resize-left" | "resize-right" | "resize-none";
export type ResizeYAxisMode = "drag" | "resize-top" | "resize-bottom" | "resize-none";

export type SnapComputationMode = {
  x: ResizeXAxisMode;
  y: ResizeYAxisMode;
};

export type ComputeSnapForRectResult = {
  snappedRect: SnapRect;
  guides: SnapGuides;
  snappedX: boolean;
  snappedY: boolean;
};

const isFinitePositive = (value: number) => Number.isFinite(value) && value > 0;

const findClosestPoint = (anchors: number[], points: number[], threshold: number) => {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestTarget: number | null = null;
  let bestAnchorIndex = -1;

  for (let anchorIndex = 0; anchorIndex < anchors.length; anchorIndex += 1) {
    const anchorValue = anchors[anchorIndex];

    for (const point of points) {
      const distance = Math.abs(point - anchorValue);

      if (distance > threshold || distance >= bestDistance) {
        continue;
      }

      bestDistance = distance;
      bestTarget = point;
      bestAnchorIndex = anchorIndex;
    }
  }

  if (bestTarget === null || bestAnchorIndex < 0) {
    return null;
  }

  return {
    anchorIndex: bestAnchorIndex,
    anchorValue: anchors[bestAnchorIndex],
    targetValue: bestTarget,
  };
};

export const buildSnapCandidates = (nodes: SnapRect[]): SnapCandidates => {
  const xPoints: number[] = [];
  const yPoints: number[] = [];

  for (const node of nodes) {
    if (!isFinitePositive(node.width) || !isFinitePositive(node.height)) {
      continue;
    }

    xPoints.push(node.x, node.x + node.width / 2, node.x + node.width);
    yPoints.push(node.y, node.y + node.height / 2, node.y + node.height);
  }

  return { xPoints, yPoints };
};

export const computeSnapForRect = (
  rect: SnapRect,
  candidates: SnapCandidates,
  threshold = 6,
  mode: SnapComputationMode = { x: "drag", y: "drag" }
): ComputeSnapForRectResult => {
  const constrainedThreshold = Math.max(0, threshold);
  const left = rect.x;
  const right = rect.x + rect.width;
  const centerX = rect.x + rect.width / 2;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const centerY = rect.y + rect.height / 2;

  let snappedX = false;
  let snappedY = false;
  let guideX: number | undefined;
  let guideY: number | undefined;

  let nextX = rect.x;
  let nextY = rect.y;
  let nextWidth = rect.width;
  let nextHeight = rect.height;

  const xAnchors =
    mode.x === "drag"
      ? [left, centerX, right]
      : mode.x === "resize-left"
        ? [left, centerX]
        : mode.x === "resize-right"
          ? [right, centerX]
          : [];
  const xSnap = findClosestPoint(xAnchors, candidates.xPoints, constrainedThreshold);

  if (xSnap) {
    if (mode.x === "drag") {
      nextX = rect.x + (xSnap.targetValue - xSnap.anchorValue);
      snappedX = true;
      guideX = xSnap.targetValue;
    } else if (mode.x === "resize-left") {
      if (xSnap.anchorIndex === 0) {
        const snappedWidth = right - xSnap.targetValue;
        if (isFinitePositive(snappedWidth)) {
          nextX = xSnap.targetValue;
          nextWidth = snappedWidth;
          snappedX = true;
          guideX = xSnap.targetValue;
        }
      } else {
        const snappedXValue = 2 * xSnap.targetValue - right;
        const snappedWidth = right - snappedXValue;
        if (isFinitePositive(snappedWidth)) {
          nextX = snappedXValue;
          nextWidth = snappedWidth;
          snappedX = true;
          guideX = xSnap.targetValue;
        }
      }
    } else if (mode.x === "resize-right") {
      if (xSnap.anchorIndex === 0) {
        const snappedWidth = xSnap.targetValue - left;
        if (isFinitePositive(snappedWidth)) {
          nextWidth = snappedWidth;
          snappedX = true;
          guideX = xSnap.targetValue;
        }
      } else {
        const snappedRight = 2 * xSnap.targetValue - left;
        const snappedWidth = snappedRight - left;
        if (isFinitePositive(snappedWidth)) {
          nextWidth = snappedWidth;
          snappedX = true;
          guideX = xSnap.targetValue;
        }
      }
    }
  }

  const yAnchors =
    mode.y === "drag"
      ? [top, centerY, bottom]
      : mode.y === "resize-top"
        ? [top, centerY]
        : mode.y === "resize-bottom"
          ? [bottom, centerY]
          : [];
  const ySnap = findClosestPoint(yAnchors, candidates.yPoints, constrainedThreshold);

  if (ySnap) {
    if (mode.y === "drag") {
      nextY = rect.y + (ySnap.targetValue - ySnap.anchorValue);
      snappedY = true;
      guideY = ySnap.targetValue;
    } else if (mode.y === "resize-top") {
      if (ySnap.anchorIndex === 0) {
        const snappedHeight = bottom - ySnap.targetValue;
        if (isFinitePositive(snappedHeight)) {
          nextY = ySnap.targetValue;
          nextHeight = snappedHeight;
          snappedY = true;
          guideY = ySnap.targetValue;
        }
      } else {
        const snappedYValue = 2 * ySnap.targetValue - bottom;
        const snappedHeight = bottom - snappedYValue;
        if (isFinitePositive(snappedHeight)) {
          nextY = snappedYValue;
          nextHeight = snappedHeight;
          snappedY = true;
          guideY = ySnap.targetValue;
        }
      }
    } else if (mode.y === "resize-bottom") {
      if (ySnap.anchorIndex === 0) {
        const snappedHeight = ySnap.targetValue - top;
        if (isFinitePositive(snappedHeight)) {
          nextHeight = snappedHeight;
          snappedY = true;
          guideY = ySnap.targetValue;
        }
      } else {
        const snappedBottom = 2 * ySnap.targetValue - top;
        const snappedHeight = snappedBottom - top;
        if (isFinitePositive(snappedHeight)) {
          nextHeight = snappedHeight;
          snappedY = true;
          guideY = ySnap.targetValue;
        }
      }
    }
  }

  return {
    snappedRect: {
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight,
    },
    guides: {
      x: guideX,
      y: guideY,
    },
    snappedX,
    snappedY,
  };
};
