# 🎙️ Voice Agent Studio

A minimal, local voice-agent pipeline built with open-source components.

The project demonstrates a complete audio pipeline that can accept either a **microphone recording** or an existing **WAV/MP3 file**, transcribe the audio locally, generate a rule-based response, and convert the response back into speech.

> **Audio Input → Speech-to-Text → Response → Text-to-Speech → Audio Output**

---

## ✨ Overview

**Voice Agent Studio** was built as a practical implementation of a voice-processing pipeline using local, open-source technologies.

The application provides three focused modules:

- **STT Lab** — Convert WAV/MP3 audio or microphone recordings into text.
- **TTS Lab** — Convert text into spoken audio using the system's local voice engine.
- **Voice Agent** — Run the complete pipeline from audio input to generated audio response.

The application is intentionally lightweight and focuses on understanding and connecting the individual components rather than building a production-scale conversational AI system.

---

## 🚀 Features

### 🎤 Multiple Audio Input Options

The application supports:

- Live microphone recording
- `.wav` files
- `.mp3` files

Recorded audio can be previewed before processing, removed, or recorded again.

### 📝 Speech-to-Text

Audio is transcribed locally using:

- `faster-whisper`
- Whisper `base` model
- CPU-based inference

### 🔊 Text-to-Speech

Text responses are converted into speech using:

- `pyttsx3`
- Local Windows speech voices
- Adjustable speech rate

No external TTS API is required.

### 🤖 Rule-Based Voice Response

The Voice Agent includes a lightweight response layer.

Depending on the transcribed input, it can return predefined responses or fall back to an echo-style response.

Example:

```text
User:
Hello

Agent:
Hello! Nice to meet you.
