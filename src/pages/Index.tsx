import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic2, Target, TrendingUp, ArrowRight } from 'lucide-react';
import { VideoUploader } from '@/components/VideoUploader';
import { AnalysisResults } from '@/components/AnalysisResults';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Index() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const { toast } = useToast();

  const analyzeMedia = async (base64: string, mimeType: string, fileName: string) => {
    setIsProcessing(true);
    setIsComplete(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-speech', {
        body: { 
          audio: base64,
          fileName,
          mimeType
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAnalysisResults(data);
      setIsComplete(true);
      
      toast({
        title: "Analysis Complete",
        description: "Your speech has been analyzed successfully.",
      });
      
    } catch (error: any) {
      console.error('Error analyzing speech:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze your speech. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleVideoSelect = async (file: File) => {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(file);
    
    const audioBase64 = await base64Promise;
    await analyzeMedia(audioBase64, file.type, file.name);
  };

  const handleAudioRecording = async (blob: Blob) => {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(blob);
    
    const audioBase64 = await base64Promise;
    await analyzeMedia(audioBase64, 'audio/webm', 'recording.webm');
  };

  const handleNewAnalysis = () => {
    setIsProcessing(false);
    setIsComplete(false);
    setAnalysisResults(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gold/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative container mx-auto px-4 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 mb-6"
            >
              <Mic2 className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-gold">AI-Powered Analysis</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 text-balance">
              Master the Art of{' '}
              <span className="text-gold">Public Speaking</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Upload your speech video or record live and receive detailed AI-powered feedback on voice modulation, 
              thought structure, and vocabulary to elevate your speaking skills.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <a href="#analyzer">
                  Start Analysis
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
            </div>
          </motion.div>
          
          {/* Feature badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6 mt-16"
          >
            {[
              { icon: Mic2, label: 'Voice Analysis' },
              { icon: Target, label: 'Structure Review' },
              { icon: TrendingUp, label: 'Improvement Tips' },
            ].map((feature, idx) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10"
              >
                <feature.icon className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-primary-foreground/80">{feature.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* Analyzer Section */}
      <section id="analyzer" className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Analyze Your Speech
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Upload a video or record yourself speaking to receive comprehensive feedback.
            </p>
          </motion.div>
          
          {!analysisResults ? (
            <VideoUploader
              onVideoSelect={handleVideoSelect}
              onAudioRecording={handleAudioRecording}
              isProcessing={isProcessing}
              isComplete={isComplete}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-center mb-8">
                <Button variant="subtle" onClick={handleNewAnalysis}>
                  ← Analyze Another Speech
                </Button>
              </div>
              <AnalysisResults results={analysisResults} />
            </motion.div>
          )}
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 SpeakMaster. AI-powered public speaking coach.
          </p>
        </div>
      </footer>
    </div>
  );
}
