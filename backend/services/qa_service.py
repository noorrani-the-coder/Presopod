from services.llm_client import cerebras_chat

def answer_question(slides, question):
    def slide_to_text(slide):
        if isinstance(slide, str):
            return slide
        title = slide.get("title", "")
        bullets = slide.get("bullets", [])
        bullets_text = "\n".join([f"- {b}" for b in bullets])
        return f"{title}\n{bullets_text}".strip()

    context = "\n\n".join([slide_to_text(s) for s in slides])

    prompt = f"""
You are a helpful presenter answering questions about the slides.
Use the content below to answer. If the answer is not directly stated,
make a short, reasonable inference based on the content. If truly not possible,
say you do not know.

Content:
{context}

Question:
{question}
"""

    response = cerebras_chat.create_chat_completion(
        messages=[
            {"role": "system", "content": "Answer questions based on provided slide content."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    return response.choices[0].message.content.strip()
