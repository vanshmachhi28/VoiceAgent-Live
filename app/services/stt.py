from faster_whisper import WhisperModel


print("Loading faster-whisper base model...")

model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)

print("faster-whisper model loaded.")


def transcribe_audio(file_path: str) -> str:
    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        vad_filter=False,
        condition_on_previous_text=True
    )

    text = " ".join(
        segment.text.strip()
        for segment in segments
    )

    return text.strip()