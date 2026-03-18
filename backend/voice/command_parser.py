def parse_command(text):
    text = text.lower()

    if "pause" in text:
        return "PAUSE"
    if "resume" in text:
        return "RESUME"
    if "next" in text:
        return "NEXT"
    if "previous" in text:
        return "PREVIOUS"

    return "QUESTION"
