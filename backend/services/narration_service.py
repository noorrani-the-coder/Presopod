from services.llm_client import cerebras_chat


ROLE_INSTRUCTIONS = {
    "teacher": """
Explain like a teacher guiding students.
- Be clear, simple, and structured.
- Briefly define the idea before the details.
- Use an easy classroom tone.
- End with the key takeaway when possible.
""",
    "student": """
Explain like a student presenting a final year project.
- Sound confident, natural, and viva-ready.
- Describe what was built, how it works, and why it matters.
- Keep the explanation simple but technically believable.
- Do not sound like you are reading directly from the slide.
""",
    "company": """
Explain like a company presenter speaking to stakeholders.
- Sound polished, concise, and outcome-focused.
- Emphasize value, workflow, efficiency, and impact.
- Keep the language professional and practical.
- Avoid classroom-style wording.
""",
}

TAMIL_ROLE_STYLE = {
    "teacher": """
For Tamil:
- Use spoken Tamil that sounds natural in a classroom.
- Avoid very pure, old-fashioned, or textbook Tamil.
- Make it sound like a real teacher explaining directly to students.
""",
    "student": """
For Tamil:
- Use spoken Tamil that sounds natural for a college student presentation.
- Avoid very pure, old-fashioned, or textbook Tamil.
- Make it sound like a real student talking confidently during a viva or demo.
""",
    "company": """
For Tamil:
- Use spoken Tamil that sounds natural in a professional presentation.
- Avoid very pure, old-fashioned, or textbook Tamil.
- Make it sound like a real presenter talking smoothly to stakeholders.
""",
}


def build_narration(slide, role="teacher", lang="en"):
    role_hint = ROLE_INSTRUCTIONS.get(role, ROLE_INSTRUCTIONS["teacher"])
    tamil_style = TAMIL_ROLE_STYLE.get(role, TAMIL_ROLE_STYLE["teacher"])
    title = slide.get("title", "")
    bullets = slide.get("bullets", [])
    bullet_text = "\n".join([f"- {b}" for b in bullets])

    if _is_team_slide(title, bullets):
        names = _extract_names(bullets)
        if names:
            return ", ".join(names) + "."
        if lang == "ta":
            return "இந்த ஸ்லைட்ல project team members details இருக்கு."
        return "Project team members are listed on this slide."

    language_hint = "Write in Tamil." if lang == "ta" else "Write in English."
    tamil_hint = tamil_style if lang == "ta" else ""
    prompt = f"""
You are narrating a slide for an audience.
{role_hint}
Do not read the bullets word-for-word. Explain them naturally.
Keep it to 1-2 short sentences.
If the slide is about a project idea or overview, explain it like a quick project pitch.
Match the speaking style to the selected role.
Do not start with greetings or fillers like "good morning", "hello", "hi everyone", "vanakkam", or "welcome".
Start directly with the slide content.
Treat this as a middle slide in a presentation, not the opening of the full presentation.
{language_hint}
{tamil_hint}

Slide title: {title}
Slide bullets:
{bullet_text}
"""

    response = cerebras_chat.create_chat_completion(
        messages=[
            {"role": "system", "content": "You are a helpful presentation narrator."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
    )

    return _remove_greeting_openers(response.choices[0].message.content.strip())


def _is_team_slide(title, bullets):
    title_l = (title or "").lower()
    if any(k in title_l for k in ["team", "members", "contributors", "authors", "our team"]):
        return True
    return _looks_like_name_list(bullets)


def _looks_like_name_list(bullets):
    if not bullets or len(bullets) < 2:
        return False
    for bullet in bullets:
        if not _looks_like_name(bullet):
            return False
    return True


def _looks_like_name(text):
    if not text:
        return False
    parts = [part for part in text.replace("-", " ").split() if part]
    if len(parts) < 2 or len(parts) > 4:
        return False
    return all(part[0].isupper() for part in parts if part[0].isalpha())


def _extract_names(bullets):
    names = []
    for bullet in bullets:
        name = bullet.strip().strip("-").strip()
        if _looks_like_name(name):
            names.append(name)
    return names


def _remove_greeting_openers(text):
    lowered = text.lstrip().lower()
    openers = [
        "good morning",
        "good afternoon",
        "good evening",
        "hello everyone",
        "hello all",
        "hi everyone",
        "hi all",
        "welcome everyone",
        "welcome all",
        "vanakkam",
    ]

    stripped = text.lstrip()
    for opener in openers:
        if lowered.startswith(opener):
            remainder = stripped[len(opener):].lstrip(" ,.!:-")
            return remainder[:1].upper() + remainder[1:] if remainder else text

    return text
