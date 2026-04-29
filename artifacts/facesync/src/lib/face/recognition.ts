import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

let loadingPromise: Promise<void> | null = null;

export async function ensureRecognitionModels(): Promise<void> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  })();
  return loadingPromise;
}

const detectorOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.5,
});

export interface DetectedFace {
  descriptor: Float32Array;
  box: { x: number; y: number; width: number; height: number };
}

export async function computeAllDescriptors(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<DetectedFace[]> {
  const results = await faceapi
    .detectAllFaces(source, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptors();
  
  return results.map(r => ({
    descriptor: r.descriptor,
    box: {
      x: r.detection.box.x,
      y: r.detection.box.y,
      width: r.detection.box.width,
      height: r.detection.box.height,
    }
  }));
}

export async function computeDescriptor(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<Float32Array | null> {
  const all = await computeAllDescriptors(source);
  return all.length > 0 ? all[0]!.descriptor : null;
}

export function averageDescriptors(samples: Float32Array[]): number[] {
  if (samples.length === 0) return [];
  const len = samples[0]!.length;
  const out = new Array<number>(len).fill(0);
  for (const s of samples) {
    for (let i = 0; i < len; i++) out[i]! += s[i]!;
  }
  for (let i = 0; i < len; i++) out[i]! /= samples.length;
  return out;
}

export function euclideanDistance(a: ArrayLike<number>, b: ArrayLike<number>) {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const d = (a[i] as number) - (b[i] as number);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export interface RecognizableProfile {
  id: number;
  name: string;
  descriptor: number[];
}

export interface MatchResult {
  profile: RecognizableProfile;
  distance: number;
}

export function bestMatch(
  descriptor: ArrayLike<number>,
  profiles: RecognizableProfile[],
  threshold = 0.55,
): MatchResult | null {
  let best: MatchResult | null = null;
  for (const p of profiles) {
    const d = euclideanDistance(descriptor, p.descriptor);
    if (best === null || d < best.distance) {
      best = { profile: p, distance: d };
    }
  }
  if (best && best.distance <= threshold) return best;
  return null;
}
