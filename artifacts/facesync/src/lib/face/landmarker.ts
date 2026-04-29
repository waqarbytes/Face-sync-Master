import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

let landmarkerInstance: FaceLandmarker | null = null;
let initializingPromise: Promise<FaceLandmarker> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    try {
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 5,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      landmarkerInstance = landmarker;
      return landmarker;
    } catch (error) {
      initializingPromise = null;
      throw error;
    }
  })();

  return initializingPromise;
}
