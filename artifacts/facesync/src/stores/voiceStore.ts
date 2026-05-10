// Simple global state for sharing voice data between VoiceLab and LiveMirror
// No external dependencies needed

let _voiceEmotion: string | null = null;
let _vocalTension: number | null = null;

export function setVoiceData(emotion: string, tension: number) {
  _voiceEmotion = emotion;
  _vocalTension = tension;
}

export function getVoiceData() {
  return { voiceEmotion: _voiceEmotion, vocalTension: _vocalTension };
}

export function clearVoiceData() {
  _voiceEmotion = null;
  _vocalTension = null;
}
