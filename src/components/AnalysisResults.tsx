import { motion } from 'framer-motion';
import { Mic, Brain, BookOpen, ChevronDown, ChevronUp, TrendingUp, AlertCircle, Lightbulb, Clock, Award, FileText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PROFICIENCY_LEVELS } from './RankingCriteria';

interface SubParameter {
  name: string;
  score: number;
  feedback: string;
  strengths?: string;
  developmentAreas?: string;
}

interface Mispronunciation {
  word: string;
  timestamp: string;
  issue: string;
  correctPronunciation?: string;
}

interface Category {
  name: string;
  icon: React.ReactNode;
  score: number;
  subParameters: SubParameter[];
}

interface TimestampedFeedback {
  timeRange: string;
  issue: string;
  suggestion: string;
}

export type ProficiencyLevel = 'Beginner' | 'Elementary' | 'Intermediate' | 'Upper-Intermediate' | 'Advanced' | 'Mastery';

interface SubParameterData {
  score: number;
  feedback: string;
  strengths?: string;
  developmentAreas?: string;
}

interface AnalysisResultsProps {
  results: {
    voiceModulation: {
      score: number;
      voiceClarity: SubParameterData;
      tonalVariation: SubParameterData;
      paceAndPauses: SubParameterData;
      fillersAndVerbalHabits: SubParameterData;
    };
    thoughtStructure: {
      score: number;
      purposeArticulation: SubParameterData;
      logicalFlow: SubParameterData;
      signposting: SubParameterData;
      closureStrength: SubParameterData;
    };
    vocabulary: {
      score: number;
      sentenceEconomy: SubParameterData;
      specificity: SubParameterData;
      redundancyControl: SubParameterData;
      confidenceOfPhrasing: SubParameterData;
      grammar: SubParameterData;
    };
    proficiencyLevel: ProficiencyLevel;
    summary: string;
    fullTranscript?: string;
    mispronunciations?: Mispronunciation[];
    wordsPerMinute?: number;
    totalWords?: number;
    durationSeconds?: number;
    timestampedFeedback?: TimestampedFeedback[];
    strengths?: string[];
    developmentAreas?: string[];
    drillSuggestion?: string;
  };
}

// Helper component to highlight mispronounced words in transcript
function TranscriptWithHighlights({ 
  transcript, 
  mispronunciations 
}: { 
  transcript: string; 
  mispronunciations: Mispronunciation[] 
}) {
  if (mispronunciations.length === 0) {
    return (
      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
        {transcript}
      </p>
    );
  }

  // Create a set of mispronounced words (lowercase for matching)
  const mispronounceMap = new Map<string, Mispronunciation>();
  mispronunciations.forEach(mp => {
    mispronounceMap.set(mp.word.toLowerCase(), mp);
  });

  // Split transcript into words while preserving whitespace and punctuation
  const parts = transcript.split(/(\s+)/);
  
  return (
    <p className="text-foreground leading-relaxed">
      {parts.map((part, idx) => {
        // Clean the word for matching (remove punctuation)
        const cleanWord = part.replace(/[.,!?;:'"()[\]{}]/g, '').toLowerCase();
        const mispronunciation = mispronounceMap.get(cleanWord);
        
        if (mispronunciation) {
          return (
            <span 
              key={idx} 
              className="text-destructive font-semibold bg-destructive/10 px-0.5 rounded cursor-help"
              title={`${mispronunciation.issue}${mispronunciation.correctPronunciation ? ` - Correct: ${mispronunciation.correctPronunciation}` : ''}`}
            >
              {part}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </p>
  );
}

function CategoryCard({ category, delay }: { category: Category; delay: number }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
            {category.icon}
          </div>
          <div className="text-left">
            <h3 className="text-xl font-display font-semibold text-foreground">
              {category.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {category.subParameters.length} sub-metrics analyzed
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "text-2xl font-display font-bold",
            category.score >= 8 ? "text-success" :
            category.score >= 6 ? "text-gold" :
            category.score >= 4 ? "text-warning" : "text-destructive"
          )}>
            {category.score.toFixed(1)}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {/* Expandable content */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-6 pb-6 space-y-4">
          {category.subParameters.map((param, idx) => (
            <motion.div
              key={param.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: delay + 0.3 + idx * 0.1 }}
              className="p-4 rounded-xl bg-muted/30"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="flex-shrink-0 w-12 text-center">
                  <span className={cn(
                    "text-2xl font-display font-bold",
                    param.score >= 8 ? "text-success" :
                    param.score >= 6 ? "text-gold" :
                    param.score >= 4 ? "text-warning" : "text-destructive"
                  )}>
                    {param.score.toFixed(1)}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">{param.name}</h4>
                  <p className="text-sm text-muted-foreground">{param.feedback}</p>
                </div>
              </div>
              
              {/* Strengths & Development Areas for this sub-parameter */}
              {(param.strengths || param.developmentAreas) && (
                <div className="ml-16 mt-3 space-y-2">
                  {param.strengths && (
                    <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                        <span className="text-xs font-semibold text-success uppercase tracking-wide">Strengths</span>
                      </div>
                      <p className="text-sm text-foreground italic">"{param.strengths}"</p>
                    </div>
                  )}
                  {param.developmentAreas && (
                    <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-warning" />
                        <span className="text-xs font-semibold text-warning uppercase tracking-wide">Areas to Improve</span>
                      </div>
                      <p className="text-sm text-foreground italic">"{param.developmentAreas}"</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function AnalysisResults({ results }: AnalysisResultsProps) {
  const categories: Category[] = [
    {
      name: 'Voice Modulation',
      icon: <Mic className="w-6 h-6 text-gold" />,
      score: results.voiceModulation.score,
      subParameters: [
        { name: 'Voice Clarity & Projection', ...results.voiceModulation.voiceClarity },
        { name: 'Tonal Variation', ...results.voiceModulation.tonalVariation },
        { name: 'Pace & Pauses', ...results.voiceModulation.paceAndPauses },
        { name: 'Fillers & Verbal Habits', ...results.voiceModulation.fillersAndVerbalHabits },
      ],
    },
    {
      name: 'Thought Structure',
      icon: <Brain className="w-6 h-6 text-gold" />,
      score: results.thoughtStructure.score,
      subParameters: [
        { name: 'Purpose Articulation', ...results.thoughtStructure.purposeArticulation },
        { name: 'Logical Flow', ...results.thoughtStructure.logicalFlow },
        { name: 'Signposting', ...results.thoughtStructure.signposting },
        { name: 'Closure Strength', ...results.thoughtStructure.closureStrength },
      ],
    },
    {
      name: 'Vocabulary',
      icon: <BookOpen className="w-6 h-6 text-gold" />,
      score: results.vocabulary.score,
      subParameters: [
        { name: 'Sentence Economy', ...results.vocabulary.sentenceEconomy },
        { name: 'Specificity', ...results.vocabulary.specificity },
        { name: 'Redundancy Control', ...results.vocabulary.redundancyControl },
        { name: 'Confidence of Phrasing', ...results.vocabulary.confidenceOfPhrasing },
        { name: 'Grammar', ...results.vocabulary.grammar },
      ],
    },
  ];

  const levelData = PROFICIENCY_LEVELS.find(l => l.name === results.proficiencyLevel) || PROFICIENCY_LEVELS[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Proficiency Level */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center py-8"
      >
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">
          Your Speaking Level
        </h2>
        
        {/* Level Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
          className="inline-flex flex-col items-center"
        >
          <div className={`w-24 h-24 rounded-full ${levelData.badgeColor} flex items-center justify-center mb-4 shadow-lg`}>
            <Award className="w-12 h-12 text-white" />
          </div>
          <span className="text-3xl font-display font-bold text-foreground">
            {results.proficiencyLevel}
          </span>
          <span className="text-sm text-muted-foreground mt-1">
            Level {levelData.level} of 6
          </span>
        </motion.div>
        
        {/* Level Description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`mt-6 p-4 rounded-xl border max-w-lg mx-auto ${levelData.color}`}
        >
          <p className="text-sm">{levelData.description}</p>
          <p className="text-xs mt-2">
            <span className="font-semibold">Focus: </span>{levelData.focus}
          </p>
        </motion.div>
        
        {/* WPM Stats */}
        {results.wordsPerMinute && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4 mt-6"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <Clock className="w-4 h-4 text-gold" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{results.wordsPerMinute}</span> words/min
              </span>
            </div>
            {results.totalWords && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{results.totalWords}</span> total words
                </span>
              </div>
            )}
            {results.durationSeconds && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {Math.floor(results.durationSeconds / 60)}:{(results.durationSeconds % 60).toString().padStart(2, '0')}
                  </span> duration
                </span>
              </div>
            )}
          </motion.div>
        )}
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-6 text-muted-foreground max-w-2xl mx-auto"
        >
          {results.summary}
        </motion.p>
      </motion.div>
      
      {/* Full Transcript with Mispronunciations */}
      {results.fullTranscript && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
        >
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-foreground">
                  Full Transcript
                </h3>
                <p className="text-sm text-muted-foreground">
                  {results.mispronunciations && results.mispronunciations.length > 0 
                    ? `${results.mispronunciations.length} pronunciation issue${results.mispronunciations.length > 1 ? 's' : ''} highlighted in red`
                    : 'No pronunciation issues detected'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <TranscriptWithHighlights 
              transcript={results.fullTranscript} 
              mispronunciations={results.mispronunciations || []} 
            />
          </div>
          
          {/* Mispronunciation Details */}
          {results.mispronunciations && results.mispronunciations.length > 0 && (
            <div className="px-6 pb-6">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Pronunciation Issues
              </h4>
              <div className="space-y-2">
                {results.mispronunciations.map((mp, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <span className="flex-shrink-0 px-2 py-0.5 rounded bg-destructive/10 text-destructive text-xs font-mono">
                      {mp.timestamp}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold text-destructive">"{mp.word}"</span>
                        <span className="text-muted-foreground"> — {mp.issue}</span>
                      </p>
                      {mp.correctPronunciation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Correct: <span className="text-success font-medium">{mp.correctPronunciation}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
      
      {/* Strengths & Development Areas */}
      {(results.strengths?.length || results.developmentAreas?.length) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Strengths */}
          {results.strengths && results.strengths.length > 0 && (
            <div className="bg-success/5 border border-success/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground">
                  Top 3 Strengths
                </h3>
              </div>
              <ul className="space-y-3">
                {results.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-success/20 text-success text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-foreground">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Development Areas */}
          {results.developmentAreas && results.developmentAreas.length > 0 && (
            <div className="bg-warning/5 border border-warning/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground">
                  Top 3 Areas to Improve
                </h3>
              </div>
              <ul className="space-y-3">
                {results.developmentAreas.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-warning/20 text-warning text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-foreground">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
      
      {/* Drill Suggestion */}
      {results.drillSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-gold/5 border border-gold/20 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                Recommended Drill
              </h3>
              <p className="text-muted-foreground">{results.drillSuggestion}</p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Timestamped Feedback */}
      {results.timestampedFeedback && results.timestampedFeedback.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
        >
          <div className="p-6 border-b border-border">
            <h3 className="text-xl font-display font-semibold text-foreground">
              Specific Moments to Review
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Timestamped feedback on key moments in your speech
            </p>
          </div>
          <div className="divide-y divide-border">
            {results.timestampedFeedback.map((feedback, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + idx * 0.1 }}
                className="p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 px-3 py-1 rounded-lg bg-gold/10 text-gold font-mono text-sm font-medium">
                    {feedback.timeRange}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-1">{feedback.issue}</p>
                    <p className="text-sm text-muted-foreground">{feedback.suggestion}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Category Cards */}
      <div className="space-y-4">
        {categories.map((category, idx) => (
          <CategoryCard key={category.name} category={category} delay={0.7 + idx * 0.2} />
        ))}
      </div>
    </div>
  );
}
