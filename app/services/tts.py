import os
import uuid

import pyttsx3


def get_voices():
    engine = pyttsx3.init()

    voices = []

    for index, voice in enumerate(engine.getProperty("voices")):
        voices.append({
            "id": voice.id,
            "name": voice.name,
            "index": index
        })

    engine.stop()

    return voices


def text_to_speech(text: str, voice_id=None, rate=160):
    os.makedirs("outputs", exist_ok=True)

    filename = f"{uuid.uuid4()}.wav"
    output_path = os.path.join("outputs", filename)

    engine = pyttsx3.init()

    engine.setProperty("rate", rate)
    engine.setProperty("volume", 1.0)

    if voice_id:
        engine.setProperty("voice", voice_id)

    engine.save_to_file(text, output_path)
    engine.runAndWait()
    engine.stop()

    if not os.path.exists(output_path):
        raise RuntimeError("TTS audio file was not created.")

    return output_path