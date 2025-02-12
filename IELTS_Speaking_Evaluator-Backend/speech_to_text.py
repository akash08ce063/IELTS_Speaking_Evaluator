import torch
import librosa
from datasets import load_dataset
import soundfile as sf
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
import librosa
import torch

LANG_ID = "en"
MODEL_ID = "jonatasgrosman/wav2vec2-large-xlsr-53-english"
SAMPLES = 10

test_dataset = []

processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID)

# Load the specific audio file
audio_file_path = "harvard.wav"
speech_array, sampling_rate = librosa.load(audio_file_path, sr=16_000)

# Process the audio file
inputs = processor(speech_array, sampling_rate=16_000, return_tensors="pt", padding=True)

# Perform the inference
with torch.no_grad():
    logits = model(inputs.input_values, attention_mask=inputs.attention_mask).logits

# Decode the results
predicted_ids = torch.argmax(logits, dim=-1)
predicted_sentences = processor.batch_decode(predicted_ids)

# Print the results
for i, predicted_sentence in enumerate(predicted_sentences):
    print("-" * 100)
    print(predicted_sentence)