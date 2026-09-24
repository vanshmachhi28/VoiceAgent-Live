import os
import subprocess
import uuid

from imageio_ffmpeg import get_ffmpeg_exe


ALLOWED_UPLOAD_EXTENSIONS = {
    ".wav",
    ".mp3"
}


def save_uploaded_audio(data: bytes, extension: str) -> str:
    """
    Save user-uploaded WAV/MP3 files.

    User uploads are restricted to WAV and MP3.
    """

    extension = extension.lower()

    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise ValueError(
            "Only WAV and MP3 files are supported."
        )

    os.makedirs("recordings", exist_ok=True)

    filename = f"{uuid.uuid4()}{extension}"
    path = os.path.join("recordings", filename)

    with open(path, "wb") as audio_file:
        audio_file.write(data)

    return path


def convert_webm_to_wav(data: bytes) -> str:
    """
    Convert browser microphone recording (WebM/Opus)
    into WAV so the rest of the application works
    exclusively with WAV/MP3 audio.
    """

    os.makedirs("recordings", exist_ok=True)

    unique_id = str(uuid.uuid4())

    webm_path = os.path.join(
        "recordings",
        f"{unique_id}.webm"
    )

    wav_path = os.path.join(
        "recordings",
        f"{unique_id}.wav"
    )

    # Temporarily save browser recording
    with open(webm_path, "wb") as audio_file:
        audio_file.write(data)

    try:

        ffmpeg = get_ffmpeg_exe()

        command = [
            ffmpeg,
            "-y",
            "-i",
            webm_path,

            # Standard mono WAV suitable for STT
            "-ar",
            "16000",

            "-ac",
            "1",

            "-sample_fmt",
            "s16",

            wav_path
        ]

        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0:
            raise RuntimeError(
                "Audio conversion failed."
            )

        if not os.path.exists(wav_path):
            raise RuntimeError(
                "Converted WAV file was not created."
            )

        return wav_path

    finally:

        # Never keep the temporary WebM file
        if os.path.exists(webm_path):
            os.remove(webm_path)