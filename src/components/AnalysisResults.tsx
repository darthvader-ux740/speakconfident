import { motion } from 'framer-motion';
import { Mic, Brain, BookOpen, ChevronDown, ChevronUp, TrendingUp, AlertCircle, Lightbulb, Clock } from 'lucide-react';
import { useState } from 'react';
import { ScoreGauge } from './ScoreGauge';
import { cn } from '@/lib/utils';

interface SubParameter {
  name: string;
  score: number;
  feedback: string;
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

interface AnalysisResultsProps {
  results: {
    voiceModulation: {
      score: number;
      voiceClarity: { score: number; feedback: string };
      tonalVariation: { score: number; feedback: string };
      paceAndPauses: { score: number; feedback: string };
      fillersAndVerbalHabits: { score: number; feedback: string };
    };
    thoughtStructure: {
      score: number;
      purposeArticulation: { score: number; feedback: string };
      logicalFlow: { score: number; feedback: string };
      signposting: { score: number; feedback: string };
      closureStrength: { score: number; feedback: string };
    };
    vocabulary: {
      score: number;
      sentenceEconomy: { score: number; feedback: string };
      specificity: { score: number; feedback: string };
      redundancyControl: { score: number; feedback: string };
      confidenceOfPhrasing: { score: number; feedback: string };
      grammar: { score: number; feedback: string };
    };
    overallScore: number;
    summary: string;
    wordsPerMinute?: number;
    totalWords?: number;
    durationSeconds?: number;
    timestampedFeedback?: TimestampedFeedback[];
    strengths?: string[];
    developmentAreas?: string[];
    drillSuggestion?: string;
  };
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
          <ScoreGauge score={category.score} label="" size="sm" delay={delay + 0.2} />
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
              className="flex items-start gap-4 p-4 rounded-xl bg-muted/30"
            >
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center py-8"
      >
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">
          Overall Speaking Score
        </h2>
        <ScoreGauge score={results.overallScore} label="out of 10" size="lg" delay={0.2} />
        
        {/* WPM Stats */}
        {results.wordsPerMinute && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex justify-center gap-8 mt-6"
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
