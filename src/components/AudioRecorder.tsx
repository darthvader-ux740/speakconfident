import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
  isComplete: boolean;
}

export function AudioRecorder({ onRecordingComplete, isProcessing, isComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true 
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setHasRecording(true);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const handleClear = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setHasRecording(false);
    setRecordingTime(0);
  };

  const handleAnalyze = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {!hasRecording && !isRecording ? (
          <motion.div
            key="start-zone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="border-2 border-dashed rounded-2xl p-12 border-border hover:border-gold/50 hover:bg-muted/30 transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-6 text-center">
              <motion.div
                className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center cursor-pointer hover:bg-gold/20 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
              >
                <Mic className="w-10 h-10 text-gold" />
              </motion.div>
              
              <div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                  Record Your Speech
                </h3>
                <p className="text-muted-foreground">
                  Click the microphone to start recording
                </p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Speak clearly into your microphone
                </p>
              </div>
              
              <Button variant="hero" onClick={startRecording}>
                <Mic className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
            </div>
          </motion.div>
        ) : isRecording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl overflow-hidden bg-card shadow-card border border-border p-8"
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                className="w-32 h-32 rounded-full bg-destructive/10 flex items-center justify-center relative"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-destructive/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <Mic className="w-12 h-12 text-destructive" />
              </motion.div>
              
              <div className="text-center">
                <p className="text-3xl font-display font-bold text-foreground">
                  {formatTime(recordingTime)}
                </p>
                <p className="text-muted-foreground mt-2">Recording in progress...</p>
              </div>
              
              <Button variant="destructive" onClick={stopRecording}>
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl overflow-hidden bg-card shadow-card border border-border"
          >
            <div className="p-8">
              <div className="flex flex-col items-center gap-6">
                {audioUrl && !isProcessing && !isComplete && (
                  <audio src={audioUrl} controls className="w-full max-w-md" />
                )}
                
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 py-8"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-12 h-12 text-gold" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-foreground font-medium">Analyzing your speech...</p>
                      <p className="text-muted-foreground text-sm mt-1">This may take a minute</p>
                    </div>
                  </motion.div>
                )}
                
                {isComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <CheckCircle className="w-16 h-16 text-success" />
                    </motion.div>
                    <p className="text-foreground font-medium">Analysis Complete!</p>
                  </motion.div>
                )}
                
                <div className="text-center">
                  <p className="font-medium text-foreground">Recording Duration</p>
                  <p className="text-2xl font-display font-bold text-gold">
                    {formatTime(recordingTime)}
                  </p>
                </div>
                
                {!isProcessing && !isComplete && (
                  <div className="flex items-center gap-3">
                    <Button variant="subtle" onClick={handleClear}>
                      Record Again
                    </Button>
                    <Button variant="hero" onClick={handleAnalyze}>
                      Analyze Speech
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
