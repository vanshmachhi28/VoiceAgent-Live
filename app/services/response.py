import re


def generate_response(text: str) -> str:
    text = text.strip()
    lower = text.lower()

    if not text:
        return (
            "I couldn't detect clear speech. "
            "Please try recording again."
        )

    if re.search(r"\b(hello|hi|hey)\b", lower):
        return "Hello! How can I help you?"

    if "what can you do" in lower or "what do you do" in lower:
        return (
            "I can convert speech to text, process the message "
            "with a simple rule based response engine, and convert "
            "the response back into speech."
        )

    if "how are you" in lower:
        return "I'm doing well. Thanks for asking."

    if "who are you" in lower or "your name" in lower:
        return (
            "I'm a local voice agent built with Python, "
            "FastAPI, faster Whisper, and pyttsx3."
        )

    if "thank you" in lower or "thanks" in lower:
        return "You're welcome!"

    if "help" in lower:
        return (
            "You can record your voice or upload a WAV or MP3 file. "
            "I will process it through the voice pipeline."
        )

    name_match = re.search(
        r"\bmy name is ([a-zA-Z]+)\b",
        text,
        re.IGNORECASE
    )

    if name_match:
        name = name_match.group(1)
        return f"Nice to meet you, {name}."

    return f"You said: {text}"