import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization
from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split
import os

# Configuration
DATA_PATH = 'data/fer2013.csv'
MODEL_SAVE_PATH = 'artifacts/ai-service/emotion_model.h5'
IMG_SIZE = 48
NUM_CLASSES = 7

def load_data():
    if not os.path.exists(DATA_PATH):
        print(f"Error: {DATA_PATH} not found. Please place the fer2013.csv file in the data folder.")
        return None, None

    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    
    pixels = df['pixels'].tolist()
    width, height = IMG_SIZE, IMG_SIZE
    
    faces = []
    for pixel_sequence in pixels:
        face = [int(pixel) for pixel in pixel_sequence.split(' ')]
        face = np.asarray(face).reshape(width, height)
        faces.append(face.astype('float32') / 255.0) # Normalize
        
    faces = np.asarray(faces)
    faces = np.expand_dims(faces, -1) # Add channel dimension
    
    emotions = to_categorical(df['emotion'], NUM_CLASSES)
    
    return faces, emotions

def build_model():
    print("Building CNN architecture...")
    model = Sequential([
        # Block 1
        Conv2D(64, (3,3), padding='same', activation='relu', input_shape=(IMG_SIZE, IMG_SIZE, 1)),
        BatchNormalization(),
        Conv2D(64, (3,3), padding='same', activation='relu'),
        BatchNormalization(),
        MaxPooling2D(pool_size=(2,2)),
        Dropout(0.25),

        # Block 2
        Conv2D(128, (3,3), padding='same', activation='relu'),
        BatchNormalization(),
        Conv2D(128, (3,3), padding='same', activation='relu'),
        BatchNormalization(),
        MaxPooling2D(pool_size=(2,2)),
        Dropout(0.25),

        # Block 3
        Conv2D(512, (3,3), padding='same', activation='relu'),
        BatchNormalization(),
        Conv2D(512, (3,3), padding='same', activation='relu'),
        BatchNormalization(),
        MaxPooling2D(pool_size=(2,2)),
        Dropout(0.25),

        # Fully Connected
        Flatten(),
        Dense(512, activation='relu'),
        BatchNormalization(),
        Dropout(0.5),
        Dense(256, activation='relu'),
        BatchNormalization(),
        Dropout(0.5),
        Dense(NUM_CLASSES, activation='softmax')
    ])
    
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    return model

def train():
    faces, emotions = load_data()
    if faces is None: return

    X_train, X_test, y_train, y_test = train_test_split(faces, emotions, test_size=0.1, random_state=42)
    
    model = build_model()
    
    print("Starting training (this may take a while)...")
    model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=30,
        batch_size=64
    )
    
    print(f"Training complete. Saving model to {MODEL_SAVE_PATH}")
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    model.save(MODEL_SAVE_PATH)

if __name__ == '__main__':
    train()
