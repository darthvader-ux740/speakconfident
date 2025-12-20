import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AnalysisHistoryItem {
  id: string;
  overall_score: number;
  full_transcript: string | null;
  categories: any;
  created_at: string;
}

interface AnalysisHistoryProps {
  onSelectAnalysis: (analysis: any) => void;
  refreshTrigger?: number;
}

export function AnalysisHistory({ onSelectAnalysis, refreshTrigger }: AnalysisHistoryProps) {
  const [analyses, setAnalyses] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const fetchAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('speech_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error: any) {
      console.error('Error fetching analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [refreshTrigger]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('speech_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== id));
      toast({
        title: "Deleted",
        description: "Analysis removed from history.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete analysis.",
        variant: "destructive",
      });
    }
  };

  const handleSelect = (analysis: AnalysisHistoryItem) => {
    onSelectAnalysis({
      overallScore: analysis.overall_score,
      fullTranscript: analysis.full_transcript,
      categories: analysis.categories,
      mispronunciations: (analysis as any).mispronunciations || [],
    });
  };

  if (analyses.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card/50 overflow-hidden"
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-gold" />
            <span className="font-medium text-foreground">Analysis History</span>
            <span className="text-sm text-muted-foreground">({analyses.length})</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : (
                  <div className="divide-y divide-border">
                    {analyses.map((analysis) => (
                      <motion.div
                        key={analysis.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between"
                        onClick={() => handleSelect(analysis)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-gold">
                              {analysis.overall_score}/10
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(analysis.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {analysis.full_transcript && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {analysis.full_transcript.substring(0, 100)}...
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(analysis.id, e)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
