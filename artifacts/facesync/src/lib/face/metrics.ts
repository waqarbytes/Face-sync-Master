import { Emotion, PostureState } from "@workspace/api-client-react";

export interface Point {
  x: number;
  y: number;
  z: number;
}

export function computeEAR(landmarks: Point[]): number {
  const leftIndices = [33, 160, 158, 133, 153, 144];
  const rightIndices = [362, 385, 387, 263, 373, 380];

  const earLeft =
    (distance(landmarks[160], landmarks[144]) + distance(landmarks[158], landmarks[153])) /
    (2.0 * distance(landmarks[33], landmarks[133]));

  const earRight =
    (distance(landmarks[385], landmarks[380]) + distance(landmarks[387], landmarks[373])) /
    (2.0 * distance(landmarks[362], landmarks[263]));

  return (earLeft + earRight) / 2.0;
}

export function computeMAR(landmarks: Point[]): number {
  // 13, 14, 78, 308
  const vertical = distance(landmarks[13], landmarks[14]);
  const horizontal = distance(landmarks[78], landmarks[308]);
  if (horizontal === 0) return 0;
  return vertical / horizontal;
}

export function decomposeMatrix(matrix: number[]): { yaw: number; pitch: number; roll: number } {
  // matrix is 4x4 row-major
  // m00, m01, m02, m03
  // m10, m11, m12, m13
  // m20, m21, m22, m23
  // m30, m31, m32, m33

  const m00 = matrix[0], m01 = matrix[1], m02 = matrix[2];
  const m10 = matrix[4], m11 = matrix[5], m12 = matrix[6];
  const m20 = matrix[8], m21 = matrix[9], m22 = matrix[10];

  const sy = Math.sqrt(m00 * m00 + m10 * m10);
  const singular = sy < 1e-6;

  let x, y, z;
  if (!singular) {
    x = Math.atan2(m21, m22);
    y = Math.atan2(-m20, sy);
    z = Math.atan2(m10, m00);
  } else {
    x = Math.atan2(-m12, m11);
    y = Math.atan2(-m20, sy);
    z = 0;
  }

  // Convert to degrees
  const pitch = x * (180 / Math.PI);
  const yaw = y * (180 / Math.PI);
  const roll = z * (180 / Math.PI);

  return { pitch, yaw, roll };
}

export function classifyPosture(
  angles: { pitch: number; yaw: number; roll: number },
  baseline: { neutralPitch: number; neutralYaw: number }
): PostureState {
  const pitchDiff = angles.pitch - baseline.neutralPitch;
  const rollAbs = Math.abs(angles.roll);
  
  if (rollAbs > 15) return "tilted";
  if (pitchDiff < -15) return "slouch";
  if (pitchDiff > 15) return "forward_head";

  return "upright";
}

export function classifyEmotion(
  blendshapes: { categoryName: string; score: number }[]
): { emotion: Emotion; confidence: number } {
  const map = new Map<string, number>();
  for (const b of blendshapes) {
    map.set(b.categoryName, b.score);
  }

  const smileLeft = map.get("mouthSmileLeft") || 0;
  const smileRight = map.get("mouthSmileRight") || 0;
  const frownLeft = map.get("mouthFrownLeft") || 0;
  const frownRight = map.get("mouthFrownRight") || 0;
  const jawOpen = map.get("jawOpen") || 0;
  const browDownLeft = map.get("browDownLeft") || 0;
  const browDownRight = map.get("browDownRight") || 0;
  const browInnerUp = map.get("browInnerUp") || 0;

  const happyScore = (smileLeft + smileRight) / 2;
  const sadScore = (frownLeft + frownRight + browDownLeft + browDownRight) / 4;
  const surprisedScore = jawOpen;
  const focusedScore = browInnerUp;

  let bestEmotion: Emotion = "neutral";
  let maxScore = 0.15; // Threshold

  if (happyScore > maxScore) { bestEmotion = "happy"; maxScore = happyScore; }
  if (sadScore > maxScore) { bestEmotion = "sad"; maxScore = sadScore; }
  if (surprisedScore > maxScore) { bestEmotion = "surprised"; maxScore = surprisedScore; }
  if (focusedScore > maxScore) { bestEmotion = "focused"; maxScore = focusedScore; }

  return { emotion: bestEmotion, confidence: maxScore };
}

export function computeWellnessScore(
  metrics: { ear: number; mar: number; posture: PostureState; emotion: Emotion },
  baseline: { earOpen: number },
  prevScore: number = 100
): number {
  let score = 100;
  
  // Posture penalty
  if (metrics.posture === "tilted") score -= 10;
  else if (metrics.posture === "slouch") score -= 18;
  else if (metrics.posture === "forward_head") score -= 22;

  // Fatigue penalty
  if (metrics.ear < 0.78 * baseline.earOpen) score -= 15;

  // Emotion penalty
  if (metrics.emotion === "sad") score -= 5;
  if (metrics.emotion === "tired") score -= 10;

  score = Math.max(0, Math.min(100, score));

  // EMA smoothing
  const alpha = 0.15;
  return alpha * score + (1 - alpha) * prevScore;
}

function distance(p1: Point, p2: Point) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
}
