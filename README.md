# Voice Agent Live

A minimal local voice agent pipeline built using open-source components.

**Pipeline:**  
Microphone / WAV / MP3 → Speech-to-Text → Rule-Based Response → Text-to-Speech → Audio Output

## What It Does

- Records audio directly from the microphone
- Allows the user to stop the recording manually
- Provides a preview of the recorded audio before processing
- Allows the user to remove or re-record the audio
- Accepts `.wav` and `.mp3` audio files
- Allows uploaded audio to be previewed before processing
- Converts speech to text using `faster-whisper`
- Generates a basic rule-based response
- Converts the response back to speech using `pyttsx3`
- Provides a simple FastAPI web interface
- Runs locally without external AI APIs

## Technologies & Models

| Component | Technology | Why I Chose It |
|---|---|---|
| Speech-to-Text | `faster-whisper` — Base model | Good transcription quality while remaining practical for CPU-based local processing |
| Text-to-Speech | `pyttsx3` | Simple offline TTS without requiring an external API |
| Microphone Recording | `sounddevice` | Allows direct microphone input from the local system |
| Audio Processing | `soundfile` | Used for handling recorded audio and WAV files |
| Backend | `FastAPI` | Lightweight and easy to use for building the voice pipeline |
| Server | `Uvicorn` | Simple ASGI server for running the FastAPI application |
| Frontend | HTML, CSS, JavaScript | Provides the three-module interface and handles audio interaction |

## How to Run

### 1. Clone the repository

```bash
git clone https://github.com/vanshmachhi28/VoiceAgent-Live.git
```

### 2. Open the project folder

```bash
cd VoiceAgent-Live
```

### 3. Install dependencies

Open a terminal in the project folder and run:

```bash
pip install -r requirements.txt
```

### 4. Start the application

```bash
python -m uvicorn app.main:app --reload
```

### 5. Open in browser

Go to:

```text
http://127.0.0.1:8000
```

## Application

The application contains three main sections:

### Speech-to-Text Lab

The STT module supports both microphone and file-based audio input.

**Microphone input:**

```text
Start Recording
      ↓
Record manually
      ↓
Stop Recording
      ↓
Preview Audio
      ↓
Transcribe
```

The recording can be removed or recorded again before transcription.

**File input:**

The user can select a `.wav` or `.mp3` file, preview it, remove it if necessary, and select another file before processing.

The selected audio is then transcribed using `faster-whisper`.

### Text-to-Speech Lab

The TTS module allows the user to:

- Enter text
- Select an available system voice
- Adjust the speech rate
- Generate speech
- Play the generated audio

The speech is generated locally using `pyttsx3`.

### Voice Agent

The Voice Agent connects the complete pipeline:

```text
Microphone / WAV / MP3
          ↓
    Speech-to-Text
          ↓
   Rule-Based Response
          ↓
    Text-to-Speech
          ↓
      Audio Output
```

For example:

```text
User:
Hello

Speech-to-Text:
Hello

Agent Response:
Hello! Nice to meet you.

Text-to-Speech:
Generated audio response
```

For inputs that do not match a predefined rule, the agent uses an echo-style response.

The response generation is intentionally rule-based because the task does not require an LLM or advanced conversational intelligence.

## Why These Libraries & Model?

### faster-whisper

I selected `faster-whisper` for Speech-to-Text because it provides Whisper-based transcription locally and is practical for CPU-based processing.

I used the **Base model** because it provides a useful balance between transcription quality and processing time for this task.

### pyttsx3

I selected `pyttsx3` for Text-to-Speech because it works locally using the system's available speech engines.

It does not require an external API or cloud service.

### sounddevice

I selected `sounddevice` to add microphone input to the original file-based voice pipeline.

It allows the application to capture audio directly from the user's microphone.

### soundfile

I used `soundfile` for handling recorded audio and WAV-based audio data.

### FastAPI

I used FastAPI to build the lightweight backend and connect the STT, response-generation, and TTS components into one application.

## Project Structure

```text
VoiceAgent-Live/
├── app/
│   ├── main.py
│   ├── services/
│   │   ├── audio.py
│   │   ├── response.py
│   │   ├── stt.py
│   │   └── tts.py
│   ├── static/
│   │   ├── app.js
│   │   └── style.css
│   └── templates/
│       ├── base.html
│       ├── stt.html
│       ├── tts.html
│       └── agent.html
├── outputs/
├── recordings/
├── requirements.txt
├── README.md
└── .gitignore
```

## End-to-End Example

A complete interaction follows this flow:

```text
1. User records a voice message
                ↓
2. Recording is previewed
                ↓
3. Audio is sent to Speech-to-Text
                ↓
4. Transcribed text is generated
                ↓
5. Rule-based response is selected
                ↓
6. Response is converted to speech
                ↓
7. Generated audio is available for playback
```

The same pipeline can also start with an existing `.wav` or `.mp3` file instead of a microphone recording.

## Future Improvement

With more time, I would improve the response-generation layer by replacing the current basic rule-based logic with a more flexible conversational component, while keeping the existing local STT and TTS pipeline.

## Scope

This implementation focuses on the core voice-agent pipeline:

**Audio Input → STT → Response → TTS → Audio Output**

It intentionally does not include:

- Live audio streaming
- Wake-word detection
- Advanced conversational intelligence
- LLM integration
- Production-scale deployment

The microphone functionality is provided as an additional input method while keeping the overall pipeline lightweight and focused on the core task.

## Project Goal

The goal of this project was to extend a basic voice-agent pipeline with direct microphone input while keeping the processing local and based on open-source components.

The project demonstrates the complete flow of:

**Speech Recognition → Response Logic → Speech Synthesis**

using locally running technologies.

## Author

**Vansh Machhi**

GitHub: https://github.com/vanshmachhi28
