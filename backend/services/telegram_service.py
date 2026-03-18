import os

import requests


def _get_chat_ids():
    raw = (os.getenv("TELEGRAM_CHAT_ID") or "").strip()
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def _get_token():
    return (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()


def telegram_enabled():
    return bool(_get_token() and _get_chat_ids())


def send_document_to_telegram(file_path, caption=""):
    token = _get_token()
    chat_ids = _get_chat_ids()
    if not token or not chat_ids:
        return {"ok": False, "error": "Telegram is not configured"}
    if not os.path.exists(file_path):
        return {"ok": False, "error": "File not found"}

    url = f"https://api.telegram.org/bot{token}/sendDocument"
    failures = []

    for chat_id in chat_ids:
        try:
            with open(file_path, "rb") as fp:
                files = {"document": fp}
                data = {"chat_id": chat_id}
                if caption:
                    data["caption"] = caption[:1024]
                response = requests.post(url, data=data, files=files, timeout=30)
                if response.status_code != 200:
                    failures.append(f"{chat_id}: HTTP {response.status_code} {response.text[:200]}")
        except Exception as exc:
            failures.append(f"{chat_id}: {exc}")

    if failures:
        return {"ok": False, "error": "; ".join(failures)}
    return {"ok": True}


def send_bytes_to_telegram(filename, content_bytes, caption=""):
    token = _get_token()
    chat_ids = _get_chat_ids()
    if not token or not chat_ids:
        return {"ok": False, "error": "Telegram is not configured"}
    if not filename:
        return {"ok": False, "error": "Filename is required"}

    url = f"https://api.telegram.org/bot{token}/sendDocument"
    failures = []

    for chat_id in chat_ids:
        try:
            files = {"document": (filename, content_bytes)}
            data = {"chat_id": chat_id}
            if caption:
                data["caption"] = caption[:1024]
            response = requests.post(url, data=data, files=files, timeout=30)
            if response.status_code != 200:
                failures.append(f"{chat_id}: HTTP {response.status_code} {response.text[:200]}")
        except Exception as exc:
            failures.append(f"{chat_id}: {exc}")

    if failures:
        return {"ok": False, "error": "; ".join(failures)}
    return {"ok": True}
