import os
import uvicorn
import numpy as np
import io
import librosa
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from PIL import Image
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
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        img_np = np.array(img)
        # DeepFace expects BGR for certain models, or we can pass the numpy array directly
        results = DeepFace.represent(img_path=img_np, model_name="Facenet", enforce_detection=True)
        if not results: raise HTTPException(status_code=404, detail="No face detected")
        return {"descriptor": results[0]["embedding"], "model": "Facenet"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        
        if custom_emotion_model:
            # Replicating the 48x48 grayscale preprocessing without OpenCV
            gray_img = img.convert("L").resize((48, 48))
            face_np = np.array(gray_img).astype('float32') / 255.0
            face_np = np.expand_dims(np.expand_dims(face_np, axis=0), axis=-1)
            
            preds = custom_emotion_model.predict(face_np)
            idx = np.argmax(preds[0])
            return {"emotion": EMOTIONS[idx], "confidence": float(preds[0][idx]), "source": "custom"}
        
        img_rgb = img.convert("RGB")
        img_np = np.array(img_rgb)
        results = DeepFace.analyze(img_path=img_np, actions=['emotion'], enforce_detection=False)
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
    Advanced Vocal Intelligence: Detects emotional state via acoustic heuristics.
    Accepts any audio format (WebM, WAV, etc.) and converts to WAV for Librosa.
    """
    try:
        import subprocess, tempfile
        contents = await file.read()
        
        # Convert any audio format to WAV using ffmpeg
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
            tmp_in.write(contents)
            tmp_in_path = tmp_in.name
        
        tmp_out_path = tmp_in_path.replace(".webm", ".wav")
        
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_in_path, "-ar", "22050", "-ac", "1", tmp_out_path],
                capture_output=True, timeout=10
            )
            y, sr = librosa.load(tmp_out_path, sr=22050)
        except Exception:
            # Fallback: try loading directly (works for WAV/MP3)
            y, sr = librosa.load(io.BytesIO(contents))
        finally:
            # Cleanup temp files
            for p in [tmp_in_path, tmp_out_path]:
                try: os.remove(p)
                except: pass
        
        # 1. Pitch Analysis (Fundamental Frequency)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
        
        # 2. Energy & RMS (Volume/Intensity)
        rms = librosa.feature.rms(y=y)
        energy = float(np.mean(rms))
        
        # 3. Spectral Centroid (Brightness/Tension)
        centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
        
        # 4. Emotion Logic (Acoustic Heuristic)
        emotion = "neutral"
        confidence = 0.5
        
        if energy < 0.005:
            emotion = "quiet"
            confidence = 0.9
        elif energy > 0.08 and centroid > 2500:
            emotion = "stressed" # High energy + bright/sharp spectrum = tension
            confidence = 0.85
        elif energy > 0.06 and pitch > 180:
            emotion = "excited" # High energy + high pitch
            confidence = 0.8
        elif energy < 0.02 and pitch < 130:
            emotion = "fatigued" # Low energy + low pitch (monotone)
            confidence = 0.75
        elif centroid < 1500:
            emotion = "calm" # Low spectral brightness
            confidence = 0.8

        return {
            "emotion": emotion,
            "confidence": confidence,
            "energy": energy,
            "pitch": float(pitch),
            "vocal_tension": float(centroid / 5000) # Normalized tension score
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)
