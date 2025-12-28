import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic2, Target, TrendingUp, ArrowRight, LogOut, User } from 'lucide-react';
import { VideoUploader } from '@/components/VideoUploader';
import { AnalysisResults } from '@/components/AnalysisResults';
import { AnalysisHistory } from '@/components/AnalysisHistory';
import { RankingCriteria } from '@/components/RankingCriteria';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
      
      // Save analysis to history
      try {
        // Calculate overall score from the three main categories
        const voiceScore = data.voiceModulation?.score || 0;
        const structureScore = data.thoughtStructure?.score || 0;
        const vocabScore = data.vocabulary?.score || 0;
        const overallScore = Math.round((voiceScore + structureScore + vocabScore) / 3 * 10) / 10;
        
        const { error: saveError } = await supabase.from('speech_analyses').insert({
          user_id: user?.id,
          overall_score: overallScore,
          full_transcript: data.fullTranscript || null,
          mispronunciations: data.mispronunciations || [],
          categories: {
            voiceModulation: data.voiceModulation,
            thoughtStructure: data.thoughtStructure,
            vocabulary: data.vocabulary,
            proficiencyLevel: data.proficiencyLevel,
            summary: data.summary,
            wordsPerMinute: data.wordsPerMinute,
            totalWords: data.totalWords,
            durationSeconds: data.durationSeconds,
            timestampedFeedback: data.timestampedFeedback,
            strengths: data.strengths,
            developmentAreas: data.developmentAreas,
            drillSuggestion: data.drillSuggestion,
          },
        });
        
        if (saveError) {
          console.error('Error saving analysis:', saveError);
        } else {
          setHistoryRefresh(prev => prev + 1);
        }
      } catch (e) {
        console.error('Error saving analysis:', e);
      }
      
      setAnalysisResults(data);
      setIsComplete(true);
      
      toast({
        title: "Analysis Complete",
        description: "Your speech has been analyzed successfully.",
      });
      
    } catch (error: any) {
      console.error('Error analyzing speech:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      let errorMessage = "Failed to analyze your speech. Please try again.";
      let errorTitle = "Analysis Failed";
      
      // Try to extract error from various possible locations
      if (error.message) {
        errorMessage = error.message;
      }
      if (error.context?.body?.error) {
        errorMessage = error.context.body.error;
      }
      if (data?.error) {
        errorMessage = data.error;
      }
      
      // Check for specific error types to provide better guidance
      if (errorMessage.includes('temporarily unavailable') || errorMessage.includes('503')) {
        errorTitle = "Service Temporarily Unavailable";
        errorMessage = "The AI analysis service is temporarily down. Please try again in a few minutes.";
      } else if (errorMessage.includes('429') || errorMessage.includes('Too many requests')) {
        errorTitle = "Rate Limit Reached";
        errorMessage = "Too many requests. Please wait a moment and try again.";
      }
      
      console.error('Displaying error:', errorMessage);
      
      toast({
        title: errorTitle,
        description: errorMessage,
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
      {/* User Header */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
          <User className="w-4 h-4 mr-2" />
          Profile
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>

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
          
          {/* Analysis History */}
          <AnalysisHistory 
            onSelectAnalysis={setAnalysisResults} 
            refreshTrigger={historyRefresh}
          />
          
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

      {/* Ranking Criteria Section */}
      <RankingCriteria />
      
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
