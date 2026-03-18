import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
    CEREBRAS_MODEL = os.getenv("CEREBRAS_MODEL", "llama3.1-8b")
