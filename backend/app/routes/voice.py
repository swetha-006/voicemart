from flask import Blueprint, request

from app.services.nlp_service import process_voice_command
from app.utils.response import error_response, success_response


voice_bp = Blueprint("voice", __name__, url_prefix="/voice")


@voice_bp.post("/process")
def process_voice():
    data = request.get_json(silent=True) or {}
    text = data.get("text")

    if not text or not str(text).strip():
        return error_response("text is required for voice processing.", status_code=422)

    result = process_voice_command(str(text))
    return success_response("Voice command processed successfully.", result)
