import { motion } from 'framer-motion';
import { Mic, Brain, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
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
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-6 text-muted-foreground max-w-2xl mx-auto"
        >
          {results.summary}
        </motion.p>
      </motion.div>
      
      {/* Category Cards */}
      <div className="space-y-4">
        {categories.map((category, idx) => (
          <CategoryCard key={category.name} category={category} delay={0.3 + idx * 0.2} />
        ))}
      </div>
    </div>
  );
}
