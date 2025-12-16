import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, X, Loader2, CheckCircle, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from './AudioRecorder';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  onVideoSelect: (file: File) => void;
  onAudioRecording: (blob: Blob) => void;
  isProcessing: boolean;
  isComplete: boolean;
}

type InputMode = 'upload' | 'record';

export function VideoUploader({ onVideoSelect, onAudioRecording, isProcessing, isComplete }: VideoUploaderProps) {
  const [mode, setMode] = useState<InputMode>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      onVideoSelect(selectedFile);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Mode Tabs */}
      {!selectedFile && !isProcessing && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-xl bg-muted p-1">
            <button
              onClick={() => setMode('upload')}
              className={cn(
                "px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2",
                mode === 'upload'
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </button>
            <button
              onClick={() => setMode('record')}
              className={cn(
                "px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2",
                mode === 'record'
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Mic className="w-4 h-4" />
              Record Live
            </button>
          </div>
        </div>
      )}

      {mode === 'record' && !selectedFile ? (
        <AudioRecorder
          onRecordingComplete={onAudioRecording}
          isProcessing={isProcessing}
          isComplete={isComplete}
        />
      ) : (
        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="upload-zone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer group",
                isDragging
                  ? "border-gold bg-gold/5 scale-[1.02]"
                  : "border-border hover:border-gold/50 hover:bg-muted/30"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleInputChange}
                className="hidden"
              />
              
              <div className="flex flex-col items-center gap-4 text-center">
                <motion.div
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                    isDragging ? "bg-gold/20" : "bg-muted group-hover:bg-gold/10"
                  )}
                  animate={{ scale: isDragging ? 1.1 : 1 }}
                >
                  <Upload className={cn(
                    "w-8 h-8 transition-colors",
                    isDragging ? "text-gold" : "text-muted-foreground group-hover:text-gold"
                  )} />
                </motion.div>
                
                <div>
                  <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                    Upload Your Speech Video
                  </h3>
                  <p className="text-muted-foreground">
                    Drag and drop your video here, or{" "}
                    <span className="text-gold font-medium">browse files</span>
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    Supports MP4, MOV, WebM • Max 100MB
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-2xl overflow-hidden bg-card shadow-card border border-border"
            >
              {/* Video Preview */}
              <div className="relative aspect-video bg-slate-dark">
                {previewUrl && (
                  <video
                    src={previewUrl}
                    className="w-full h-full object-contain"
                    controls={!isProcessing}
                  />
                )}
                
                {/* Processing Overlay */}
                <AnimatePresence>
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-dark/90 flex flex-col items-center justify-center gap-4"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-12 h-12 text-gold" />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-primary-foreground font-medium">Analyzing your speech...</p>
                        <p className="text-primary-foreground/60 text-sm mt-1">This may take a minute</p>
                      </div>
                    </motion.div>
                  )}
                  
                  {isComplete && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 bg-slate-dark/90 flex flex-col items-center justify-center gap-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      >
                        <CheckCircle className="w-16 h-16 text-success" />
                      </motion.div>
                      <p className="text-primary-foreground font-medium">Analysis Complete!</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* File Info & Actions */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground truncate max-w-[200px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {!isProcessing && !isComplete && (
                    <>
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={handleClear}
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </Button>
                      <Button
                        variant="hero"
                        size="default"
                        onClick={handleAnalyze}
                      >
                        Analyze Speech
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
