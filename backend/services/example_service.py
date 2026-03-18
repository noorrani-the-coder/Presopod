from services.llm_client import cerebras_chat


ROLE_SYSTEM = {
    "teacher": "You are a helpful teacher giving simple teaching examples.",
    "student": "You are a student presenting a final year project with simple relatable examples.",
    "company": "You are a professional company presenter using practical business-style examples.",
}

ROLE_EXAMPLE_GUIDANCE = {
    "teacher": "Use a simple classroom-friendly or everyday example that makes the idea easy to understand.",
    "student": "Use a practical student-project example that helps explain the system clearly during a viva.",
    "company": "Use a practical real-world or business example that highlights value, workflow, or efficiency.",
}

TAMIL_EXAMPLE_STYLE = {
    "teacher": "If writing in Tamil, use natural spoken Tamil like a teacher casually explaining to students, not pure literary Tamil.",
    "student": "If writing in Tamil, use natural spoken Tamil like a student presenting live, not pure literary Tamil.",
    "company": "If writing in Tamil, use natural spoken Tamil like a professional presenter speaking smoothly, not pure literary Tamil.",
}


def generate_example(slide_text, role="teacher", lang="en"):
    system_msg = ROLE_SYSTEM.get(role, ROLE_SYSTEM["teacher"])
    role_guidance = ROLE_EXAMPLE_GUIDANCE.get(role, ROLE_EXAMPLE_GUIDANCE["teacher"])
    language_hint = "Write in Tamil." if lang == "ta" else "Write in English."
    tamil_style = TAMIL_EXAMPLE_STYLE.get(role, TAMIL_EXAMPLE_STYLE["teacher"]) if lang == "ta" else ""
    prompt = f"""
Explain the following content with a simple real-life example.
Keep it 1-2 short sentences and beginner-friendly.
{role_guidance}
{language_hint}
{tamil_style}

Content:
{slide_text}
"""

    response = cerebras_chat.create_chat_completion(
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
    )

    return response.choices[0].message.content.strip()
