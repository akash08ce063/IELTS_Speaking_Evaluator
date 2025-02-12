from fastapi import FastAPI, File, Form, Request
import numpy as np
import io
from fastapi.middleware.cors import CORSMiddleware
from speech_recongnizer import SpeechRecognizer
from ielts_model_evaluator import Evaluator
import math as Math

app = FastAPI()

speech_recognizer = SpeechRecognizer()
evaluator = Evaluator()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload_audio_stream/")
async def upload_audio_stream(request: Request):
    """Receive audio stream, process it with librosa, and save it"""
    form_data = await request.form()  # This parses all the form data into a MultiDict
    topic = form_data.get('topic')  # Extract the topic from the form data
    audio_file = form_data.get('audio')  # Extract the audio file from the form data
    audio_stream = await audio_file.read()  # Read audio file contents as bytes
    audio_data = io.BytesIO(audio_stream)  # Convert byte data into a file-like object
    try:

        transcription = speech_recognizer.recognize(audio_data)  # Call the speech recognizer to process the audio data
        evaluation_result = evaluator.evaluate(topic, transcription)  # Call the evaluator to process the transcription

        return {
            "pronunciation_score": 7,
            "fluency_score": evaluation_result.fluency_score,
            "grammar_score": evaluation_result.grammer_score,
            "vocabulary_score": evaluation_result.vocabulary_score,
            "overall_score": Math.ceil((evaluation_result.grammer_score + evaluation_result.vocabulary_score + evaluation_result.fluency_score + 4) / 4),
            "feedback": evaluation_result.feedback,
            "transcription": transcription,
        }

    except Exception as e:
        return {"error": f"Error processing audio: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
