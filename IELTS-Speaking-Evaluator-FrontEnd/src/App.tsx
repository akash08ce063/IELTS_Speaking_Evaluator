import React, { useState, useRef } from 'react';
import { Mic, Square, Send, Timer, Volume2, AlertCircle, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';

type RecordingState = 'idle' | 'recording' | 'finished' | 'evaluating';

type EvaluationResult = {
  pronunciation_score?: number;
  fluency_score?: number;
  grammar_score?: number;
  vocabulary_score?: number;
  overall_score?: number;
  feedback?: string;
  transcription?: string;
  error?: string;
};

type HistoryEntry = {
  id: string;
  date: Date;
  topic: string;
  audioUrl: string;
  result: EvaluationResult;
};

const topics = [
  "Describe your favorite book and why you like it.",
  "Talk about a memorable trip you've taken.",
  "Describe your hometown and what makes it special.",
  "Discuss your future career goals.",
  "Talk about a person who has influenced your life.",
  "What are your hobbies and why do you enjoy them?",
  "Describe a festival or celebration in your culture.",
  "Talk about a technological advancement that has impacted your life.",
  "Describe your ideal job and explain why it appeals to you.",
  "Discuss the importance of environmental protection.",
];

const ScoreCard = ({ label, score }: { label: string; score?: number }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm">
    <h3 className="text-sm font-medium text-gray-500 mb-1">{label}</h3>
    <div className="text-2xl font-bold text-indigo-600">
      {score ? score.toFixed(1) : '-'}/9.0
    </div>
    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
        style={{ width: score ? `${(score / 9) * 100}%` : '0%' }}
      />
    </div>
  </div>
);

const HistoryItem = ({ entry, onClick, isSelected }: { 
  entry: HistoryEntry; 
  onClick: () => void;
  isSelected: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-indigo-50 transition-colors
      ${isSelected ? 'bg-indigo-50' : ''}`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-500">
        {entry.date.toLocaleDateString()} {entry.date.toLocaleTimeString()}
      </span>
      <span className="text-sm font-semibold text-indigo-600">
        {entry.result.overall_score?.toFixed(1)}/9.0
      </span>
    </div>
    <p className="text-sm text-gray-700 line-clamp-2">{entry.topic}</p>
  </button>
);

function App() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<HistoryEntry | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const getRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * topics.length);
    setCurrentTopic(topics[randomIndex]);
    setEvaluationResult(null);
    setAudioUrl(null);
    setSelectedHistoryEntry(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setRecordingState('recording');
      
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Unable to access microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecordingState('finished');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };
    }
  };

  const handleSubmit = async () => {
    if (chunksRef.current.length === 0) return;
    
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
    setRecordingState('evaluating');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('topic', currentTopic);

      const response = await fetch('http://127.0.0.1:8000/upload_audio_stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Server response was not ok');
      }

      const result = await response.json();
      setEvaluationResult(result);

      // Add to history
      if (!result.error && audioUrl) {
        const newEntry: HistoryEntry = {
          id: Date.now().toString(),
          date: new Date(),
          topic: currentTopic,
          audioUrl,
          result,
        };
        setHistory(prev => [newEntry, ...prev]);
      }
    } catch (error) {
      setEvaluationResult({
        error: 'Failed to evaluate recording. Please try again.'
      });
    } finally {
      setRecordingState('idle');
      setTimeLeft(180);
    }
  };

  const resetEvaluation = () => {
    setCurrentTopic('');
    setEvaluationResult(null);
    setAudioUrl(null);
    setSelectedHistoryEntry(null);
    chunksRef.current = [];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showHistoryEntry = (entry: HistoryEntry) => {
    setSelectedHistoryEntry(entry);
    setCurrentTopic(entry.topic);
    setAudioUrl(entry.audioUrl);
    setEvaluationResult(entry.result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex h-screen">
        {/* History Panel */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">History</h2>
            <p className="text-sm text-gray-500">Your previous evaluations</p>
          </div>
          <div className="divide-y divide-gray-100">
            {history.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Clock className="mx-auto mb-2 text-gray-400" />
                <p>No recordings yet</p>
              </div>
            ) : (
              history.map(entry => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  onClick={() => showHistoryEntry(entry)}
                  isSelected={selectedHistoryEntry?.id === entry.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-5xl font-extrabold text-blue-900 tracking-wide bg-gradient-to-r from-blue-200 via-teal-200 to-green-200 p-6 rounded-xl" style={{ fontFamily: 'Jazz Script' }}>
                  IELTS AI Speaking Evaluator
                </h1>
                {currentTopic && (
                  <button
                    onClick={resetEvaluation}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Start New Evaluation
                  </button>
                )}
              </div>
              
              {!currentTopic ? (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold text-gray-700 mb-4">Welcome to IELTS Speaking Practice</h2>
                  <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                    Practice your IELTS speaking skills with our AI evaluator. You'll get a random topic and have 3 minutes to speak about it. 
                    Our system will evaluate your pronunciation, fluency, grammar, and vocabulary.
                  </p>
                  <button
                    onClick={getRandomTopic}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-lg hover:bg-indigo-700 transition-colors text-lg font-semibold"
                  >
                    Start Practice
                  </button>
                </div>
              ) : (
                <div>
                  <div className="bg-indigo-50 p-6 rounded-lg mb-8">
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">Your Topic:</h2>
                    <p className="text-gray-600 text-lg">{currentTopic}</p>
                  </div>

                  {!evaluationResult ? (
                    <div className="flex flex-col items-center gap-6">
                      <div className="text-3xl font-mono font-bold text-indigo-600">
                        {formatTime(timeLeft)}
                      </div>

                      <div className="flex gap-4">
                        {recordingState === 'idle' && !selectedHistoryEntry && (
                          <button
                            onClick={startRecording}
                            className="flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-lg hover:bg-red-700 transition-colors text-lg"
                          >
                            <Mic size={24} />
                            Start Recording
                          </button>
                        )}

                        {recordingState === 'recording' && (
                          <button
                            onClick={stopRecording}
                            className="flex items-center gap-2 bg-gray-600 text-white px-8 py-4 rounded-lg hover:bg-gray-700 transition-colors text-lg"
                          >
                            <Square size={24} />
                            Stop Recording
                          </button>
                        )}

                        {recordingState === 'finished' && (
                          <>
                            {audioUrl && (
                              <audio ref={audioRef} src={audioUrl} controls className="mb-4" />
                            )}
                            {!selectedHistoryEntry && (
                              <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition-colors text-lg"
                              >
                                <Send size={24} />
                                Submit Recording
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {recordingState === 'recording' && (
                        <div className="flex items-center gap-2 text-red-600">
                          <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                          Recording in progress...
                        </div>
                      )}

                      {recordingState === 'evaluating' && (
                        <div className="flex items-center gap-2 text-indigo-600">
                          <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse" />
                          Evaluating your speaking...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-8">
                      {evaluationResult.error ? (
                        <div className="flex items-center gap-3 text-red-600 p-4 bg-red-50 rounded-lg">
                          <AlertCircle />
                          <p>{evaluationResult.error}</p>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-2xl font-bold text-gray-800 mb-6">Evaluation Results</h2>

                          {/* Transcription Section */}
                          <div className="bg-gray-50 rounded-lg p-6 mb-8">
                            <h3 className="text-lg font-medium text-gray-700 mb-4">Transcription</h3>
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <p className="text-gray-700 whitespace-pre-line">
                                {evaluationResult.transcription || "No transcription available"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <ScoreCard label="Pronunciation" score={evaluationResult.pronunciation_score} />
                            <ScoreCard label="Fluency" score={evaluationResult.fluency_score} />
                            <ScoreCard label="Grammar" score={evaluationResult.grammar_score} />
                            <ScoreCard label="Vocabulary" score={evaluationResult.vocabulary_score} />
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <CheckCircle2 className="text-green-600" />
                              <h3 className="text-xl font-semibold text-gray-800">Overall Score: {evaluationResult.overall_score?.toFixed(1)}/9.0</h3>
                            </div>
                            
                            <div className="prose max-w-none">
                              <h4 className="text-lg font-medium text-gray-700 mb-2">Feedback:</h4>
                              <p className="text-gray-600 whitespace-pre-line">{evaluationResult.feedback}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;