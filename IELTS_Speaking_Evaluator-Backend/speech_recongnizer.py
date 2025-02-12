import librosa
import numpy as np
import io
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
from pydub import AudioSegment

LANG_ID = "en"
MODEL_ID = "jonatasgrosman/wav2vec2-large-xlsr-53-english"
SAMPLES = 10

class SpeechRecognizer:
    def __init__(self):
        self.processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
        self.model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID)

    def recognize(self, audio_input):
        # Placeholder for actual speech recognition logic
        audio = AudioSegment.from_file(audio_input)
        wav_data = io.BytesIO()
        audio.export(wav_data, format="wav")  # Convert to WAV format

        # Rewind the BytesIO object so librosa can read from it
        wav_data.seek(0)

     
        # Load the audio file into librosa (this can handle .mp3, .wav, etc.)
        speech_array, sampling_rate = librosa.load(wav_data, sr=16_000)  # `sr=None` keeps the original sample rate

        # Process the audio file
        inputs = self.processor(speech_array, sampling_rate=16_000, return_tensors="pt", padding=True)

        # Perform the inference
        with torch.no_grad():
            logits = self.model(inputs.input_values, attention_mask=inputs.attention_mask).logits

        # Decode the results
        predicted_ids = torch.argmax(logits, dim=-1)
        predicted_sentences = self.processor.batch_decode(predicted_ids)

        return " ".join(predicted_sentences)  # Return the first predicted sentence
