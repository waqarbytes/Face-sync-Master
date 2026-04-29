import { useRef, useState, useCallback, useEffect } from "react";
import { getFaceLandmarker } from "@/lib/face/landmarker";
import {
  computeEAR,
  computeMAR,
  decomposeMatrix,
  classifyPosture,
  classifyEmotion,
  computeWellnessScore,
} from "@/lib/face/metrics";
import type { Emotion, PostureState } from "@workspace/api-client-react";

export type FaceMetrics = {
  ear: number;
  mar: number;
  yaw: number;
  pitch: number;
  roll: number;
  posture: PostureState;
  emotion: Emotion;
  emotionConfidence: number;
  wellnessScore: number;
};

type TrackerStatus = "idle" | "loading" | "ready" | "denied" | "error";

export function useFaceTracker(
  baseline: { earOpen: number; neutralPitch: number; neutralYaw: number } | undefined
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [allMetrics, setAllMetrics] = useState<FaceMetrics[]>([]);

  const baselineRef = useRef(baseline);
  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);

  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevScoresRef = useRef<Record<number, number>>({});
  const isRunningRef = useRef(false);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
    setAllMetrics([]);
  }, []);

  const start = useCallback(async () => {
    // We check baselineRef.current instead of the prop
    if (!baselineRef.current) return;
    try {
      setStatus("loading");
      const landmarker = await getFaceLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 540 },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (!videoRef.current) return resolve(null);
          videoRef.current.onloadedmetadata = () => {
            resolve(null);
          };
        });
        await videoRef.current.play();
      }

      setStatus("ready");
      isRunningRef.current = true;
      prevScoresRef.current = {};

      let lastVideoTime = -1;

      const drawAndDetect = () => {
        if (!isRunningRef.current) return;
        const currentBaseline = baselineRef.current;
        if (!currentBaseline) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) {
          requestRef.current = requestAnimationFrame(drawAndDetect);
          return;
        }

        const startTimeMs = performance.now();
        if (lastVideoTime !== video.currentTime) {
          lastVideoTime = video.currentTime;
          const results = landmarker.detectForVideo(video, startTimeMs);

          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const metricsList: FaceMetrics[] = [];
            
            results.faceLandmarks.forEach((landmarks, idx) => {
              const blendshapes = results.faceBlendshapes?.[idx]?.categories || [];
              const matrixRaw = results.facialTransformationMatrixes?.[idx]?.data || [];

              let yaw = 0, pitch = 0, roll = 0;
              if (matrixRaw.length === 16) {
                const angles = decomposeMatrix(Array.from(matrixRaw));
                yaw = angles.yaw;
                pitch = angles.pitch;
                roll = angles.roll;
              }

              const ear = computeEAR(landmarks);
              const mar = computeMAR(landmarks);

              const posture = classifyPosture({ yaw, pitch, roll }, currentBaseline);
              const { emotion, confidence } = classifyEmotion(blendshapes);
              
              const prevScore = prevScoresRef.current[idx] ?? 100;
              const wellnessScore = computeWellnessScore(
                { ear, mar, posture, emotion },
                currentBaseline,
                prevScore
              );
              prevScoresRef.current[idx] = wellnessScore;

              metricsList.push({
                ear,
                mar,
                yaw,
                pitch,
                roll,
                posture,
                emotion,
                emotionConfidence: confidence,
                wellnessScore,
              });

              // Draw individual landmarks
              if (ctx) {
                ctx.save();
                ctx.strokeStyle = `hsla(${160 + idx * 40}, 60%, 40%, 0.4)`;
                ctx.lineWidth = 1;
                for (const pt of landmarks) {
                  const x = pt.x * canvas.width;
                  const y = pt.y * canvas.height;
                  ctx.beginPath();
                  ctx.arc(x, y, 1, 0, 2 * Math.PI);
                  ctx.stroke();
                }
                ctx.restore();
              }
            });
            
            setAllMetrics(metricsList);
          } else {
            setAllMetrics([]);
          }
        }
        requestRef.current = requestAnimationFrame(drawAndDetect);
      };

      drawAndDetect();
    } catch (err: any) {
      console.error(err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("denied");
      } else {
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === "hidden") {
        stop();
      }
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      stop();
    };
  }, [stop]);

  return { videoRef, canvasRef, status, allMetrics, start, stop };
}
