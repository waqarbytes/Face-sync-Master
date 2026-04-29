import os
import uvicorn
import numpy as np
import io
import librosa
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import cv2
from deepface import DeepFace
import tensorflow as tf

app = FastAPI(title="FaceSync AI Service")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
EMOTION_MODEL_PATH = "emotion_model.h5"
custom_emotion_model = None
EMOTIONS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

@app.on_event("startup")
async def load_models():
    global custom_emotion_model
    if os.path.exists(EMOTION_MODEL_PATH):
        try:
            print(f"Loading custom emotion model from {EMOTION_MODEL_PATH}...")
            custom_emotion_model = tf.keras.models.load_model(EMOTION_MODEL_PATH)
            print("Custom emotion model loaded successfully.")
        except Exception as e:
            print(f"Failed to load custom emotion model: {e}")

@app.post("/enroll")
async def enroll_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None: raise HTTPException(status_code=400, detail="Invalid image")
        results = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=True)
        if not results: raise HTTPException(status_code=404, detail="No face detected")
        return {"descriptor": results[0]["embedding"], "model": "Facenet"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None: raise HTTPException(status_code=400, detail="Invalid image")

        if custom_emotion_model:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_img = cv2.resize(gray, (48, 48))
            face_img = face_img.astype('float32') / 255.0
            face_img = np.expand_dims(np.expand_dims(face_img, axis=0), axis=-1)
            preds = custom_emotion_model.predict(face_img)
            idx = np.argmax(preds[0])
            return {"emotion": EMOTIONS[idx], "confidence": float(preds[0][idx]), "source": "custom"}
        
        results = DeepFace.analyze(img_path=img, actions=['emotion'], enforce_detection=False)
        return {"emotion": results[0]["dominant_emotion"], "confidence": results[0]["emotion"][results[0]["dominant_emotion"]] / 100, "source": "deepface"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- VOICE INTELLIGENCE ---

@app.post("/voice/enroll")
async def enroll_voice(file: UploadFile = File(...)):
    """
    Extracts a vocal fingerprint (MFCC mean) from audio.
    """
    try:
        contents = await file.read()
        y, sr = librosa.load(io.BytesIO(contents))
        # Extract MFCCs
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        # Use mean as a simple fingerprint
        fingerprint = np.mean(mfccs, axis=1).tolist()
        return {"descriptor": fingerprint}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice enrollment failed: {e}")

@app.post("/voice/analyze")
async def analyze_voice(file: UploadFile = File(...)):
    """
    Detects emotion and vocal energy from audio.
    """
    try:
        contents = await file.read()
        y, sr = librosa.load(io.BytesIO(contents))
        
        # 1. Pitch Analysis
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
        
        # 2. Energy Analysis (RMS)
        rms = librosa.feature.rms(y=y)
        energy = float(np.mean(rms))
        
        # 3. Simple Emotion Heuristic
        emotion = "neutral"
        confidence = 0.5
        
        if energy > 0.05:
            if pitch > 200: emotion = "happy"
            elif pitch < 120: emotion = "sad"
            else: emotion = "focused"
            confidence = 0.8
        else:
            emotion = "quiet"
            confidence = 0.9

        return {
            "emotion": emotion,
            "confidence": confidence,
            "energy": energy,
            "pitch": float(pitch)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)
