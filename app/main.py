import os
from pathlib import Path

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.services.audio import (
    save_uploaded_audio,
    convert_webm_to_wav,
)
from app.services.response import generate_response
from app.services.stt import transcribe_audio
from app.services.tts import get_voices, text_to_speech


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

STATIC_DIR = BASE_DIR / "app" / "static"
TEMPLATES_DIR = BASE_DIR / "app" / "templates"
OUTPUTS_DIR = BASE_DIR / "outputs"
RECORDINGS_DIR = BASE_DIR / "recordings"

# Make sure required folders exist
OUTPUTS_DIR.mkdir(exist_ok=True)
RECORDINGS_DIR.mkdir(exist_ok=True)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Voice Agent Studio",
    description=(
        "A local speech-to-text, response, "
        "and text-to-speech pipeline."
    ),
)


# ============================================================
# STATIC FILES
# ============================================================

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)

app.mount(
    "/outputs",
    StaticFiles(directory=OUTPUTS_DIR),
    name="outputs",
)

app.mount(
    "/recordings",
    StaticFiles(directory=RECORDINGS_DIR),
    name="recordings",
)


# ============================================================
# TEMPLATES
# ============================================================

templates = Jinja2Templates(
    directory=TEMPLATES_DIR
)


# ============================================================
# PAGE ROUTES
# ============================================================

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="stt.html",
        context={},
    )


@app.get("/stt", response_class=HTMLResponse)
async def stt_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="stt.html",
        context={},
    )


@app.get("/tts", response_class=HTMLResponse)
async def tts_page(request: Request):
    voices = get_voices()

    return templates.TemplateResponse(
        request=request,
        name="tts.html",
        context={
            "voices": voices,
        },
    )


@app.get("/agent", response_class=HTMLResponse)
async def agent_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="agent.html",
        context={},
    )


# ============================================================
# AUDIO HELPERS
# ============================================================

async def save_audio_upload(file: UploadFile):
    """
    Accept only WAV and MP3 from the user.

    Browser microphone recordings may arrive internally
    as WebM. Those are converted to a real WAV file
    before entering the STT pipeline.
    """

    filename = file.filename or ""
    extension = os.path.splitext(filename)[1].lower()

    data = await file.read()

    if not data:
        raise ValueError(
            "The uploaded audio file is empty."
        )

    # --------------------------------------------------------
    # Normal user uploads
    # --------------------------------------------------------

    if extension in {".wav", ".mp3"}:
        return save_uploaded_audio(
            data,
            extension,
        )

    # --------------------------------------------------------
    # Browser microphone recording
    # --------------------------------------------------------

    if extension in {".webm", ".ogg"}:
        return convert_webm_to_wav(data)

    raise ValueError(
        "Only WAV and MP3 files are supported."
    )


# ============================================================
# MICROPHONE RECORDING CONVERSION
# ============================================================

@app.post("/api/convert-recording")
async def convert_recording(
    file: UploadFile = File(...)
):
    """
    Convert the browser's temporary WebM recording
    into a real WAV file.

    The browser uses WebM internally because that is
    what MediaRecorder normally produces.

    The user-facing application only works with
    WAV/MP3 audio.
    """

    try:
        data = await file.read()

        if not data:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Recording is empty.",
                },
            )

        wav_path = convert_webm_to_wav(data)

        wav_path = Path(wav_path)

        filename = wav_path.name

        return {
            "success": True,
            "filename": "Microphone recording.wav",
            "path": f"/recordings/{filename}",
        }

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(exc),
            },
        )


# ============================================================
# STT API
# ============================================================

@app.post("/api/stt")
async def stt_api(
    file: UploadFile = File(...)
):
    try:

        audio_path = await save_audio_upload(file)

        transcription = transcribe_audio(
            audio_path
        )

        if not transcription:
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "message": (
                        "No clear speech was detected. "
                        "The recording may contain music, "
                        "noise, or very little speech."
                    ),
                },
            )

        return {
            "success": True,
            "transcription": transcription,
        }

    except Exception as exc:

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": str(exc),
            },
        )


# ============================================================
# TTS API
# ============================================================

@app.post("/api/tts")
async def tts_api(
    text: str = Form(...),
    voice_id: str = Form(""),
    rate: int = Form(160),
):
    try:

        text = text.strip()

        if not text:
            raise ValueError(
                "Please enter some text first."
            )

        output_path = text_to_speech(
            text=text,
            voice_id=voice_id or None,
            rate=rate,
        )

        filename = os.path.basename(
            output_path
        )

        return {
            "success": True,
            "audio_url": (
                f"/outputs/{filename}"
            ),
        }

    except Exception as exc:

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": str(exc),
            },
        )


# ============================================================
# VOICE AGENT API
# ============================================================

@app.post("/api/agent")
async def agent_api(
    file: UploadFile = File(...)
):
    try:

        # ----------------------------------------------------
        # STEP 1 — AUDIO INPUT
        # ----------------------------------------------------

        audio_path = await save_audio_upload(
            file
        )

        # ----------------------------------------------------
        # STEP 2 — SPEECH TO TEXT
        # ----------------------------------------------------

        transcription = transcribe_audio(
            audio_path
        )

        if not transcription:

            return {
                "success": False,
                "stage": "stt",
                "message": (
                    "No clear speech was detected. "
                    "Try a clearer recording with "
                    "less background noise."
                ),
            }

        # ----------------------------------------------------
        # STEP 3 — RESPONSE
        # ----------------------------------------------------

        response = generate_response(
            transcription
        )

        # ----------------------------------------------------
        # STEP 4 — TEXT TO SPEECH
        # ----------------------------------------------------

        output_path = text_to_speech(
            response
        )

        filename = os.path.basename(
            output_path
        )

        # ----------------------------------------------------
        # COMPLETE PIPELINE
        # ----------------------------------------------------

        return {
            "success": True,
            "transcription": transcription,
            "response": response,
            "audio_url": (
                f"/outputs/{filename}"
            ),
        }

    except Exception as exc:

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "stage": "pipeline",
                "message": str(exc),
            },
        )