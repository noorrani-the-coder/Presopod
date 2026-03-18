import os
from gtts import gTTS
from services.narration_service import build_narration, _is_team_slide
from services.example_service import generate_example

MAX_LEN = 500

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_BASE = os.path.join(BASE_DIR, "data", "output")


def generate_audio(text, path, lang="en"):
    tts = gTTS(text[:MAX_LEN], lang=lang)
    tts.save(path)


def _slide_to_text(slide):
    title = slide.get("title", "")
    bullets = slide.get("bullets", [])
    return title + "\n" + "\n".join(bullets)


def generate_slide_audio(slides, session_id, role="teacher", lang="en"):
    os.makedirs(OUTPUT_BASE, exist_ok=True)

    output_dir = os.path.join(OUTPUT_BASE, session_id)
    os.makedirs(output_dir, exist_ok=True)

    for i, slide in enumerate(slides):
        # ---------- SLIDE NARRATION ----------
        narration_text = build_narration(slide, role, lang)
        slide_audio_path = os.path.join(output_dir, f"slide_{i}.mp3")
        generate_audio(narration_text, slide_audio_path, lang)

        # ---------- EXAMPLE / PODCAST ----------
        example_path = None
        if not _is_team_slide(slide.get("title", ""), slide.get("bullets", [])):
            example_text = generate_example(_slide_to_text(slide), role, lang)
            example_audio_path = os.path.join(output_dir, f"example_{i}.mp3")
            generate_audio(example_text, example_audio_path, lang)
            example_path = f"/data/output/{session_id}/example_{i}.mp3"

        # ---------- ATTACH BOTH ----------
        slide["audio"] = {
            "slide": f"/data/output/{session_id}/slide_{i}.mp3",
            "example": example_path
        }

    return slides
