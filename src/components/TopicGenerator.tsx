import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SPEECH_TOPICS = [
  "Describe your morning routine and why it works for you",
  "Talk about your favorite meal and how to prepare it",
  "Share a memorable travel experience",
  "Explain a hobby you're passionate about",
  "Describe your ideal weekend",
  "Talk about a book or movie that changed your perspective",
  "Share advice for someone starting a new job",
  "Describe the city or town where you grew up",
  "Talk about a skill you'd like to learn and why",
  "Share your thoughts on work-life balance",
  "Describe a person who has influenced your life",
  "Talk about the importance of daily exercise",
  "Share your favorite way to relax after a busy day",
  "Describe a challenge you overcame",
  "Talk about the benefits of learning a new language",
  "Share your thoughts on social media",
  "Describe your dream vacation destination",
  "Talk about your favorite season and why",
  "Share a childhood memory that shaped who you are",
  "Describe what friendship means to you",
  "Talk about the importance of reading",
  "Share your thoughts on healthy eating habits",
  "Describe a goal you're working toward",
  "Talk about a tradition your family celebrates",
  "Share advice for managing stress",
  "Describe your favorite outdoor activity",
  "Talk about the importance of saving money",
  "Share your thoughts on remote work",
  "Describe a lesson you learned the hard way",
  "Talk about what motivates you each day",
];

interface TopicGeneratorProps {
  onTopicSelect: (topic: string) => void;
}

export function TopicGenerator({ onTopicSelect }: TopicGeneratorProps) {
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const generateTopic = () => {
    setIsAnimating(true);
    const randomIndex = Math.floor(Math.random() * SPEECH_TOPICS.length);
    const newTopic = SPEECH_TOPICS[randomIndex];
    
    setTimeout(() => {
      setCurrentTopic(newTopic);
      onTopicSelect(newTopic);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {currentTopic ? (
          <motion.div
            key="topic"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gold/10 border border-gold/30 rounded-xl p-6 mb-6"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-gold mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gold mb-2">Your Topic</p>
                <p className="text-lg font-display font-semibold text-foreground">
                  {currentTopic}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={generateTopic}
                disabled={isAnimating}
                className="text-gold hover:text-gold/80"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isAnimating ? 'animate-spin' : ''}`} />
                New Topic
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="generate-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center mb-6"
          >
            <Button
              variant="subtle"
              onClick={generateTopic}
              disabled={isAnimating}
              className="gap-2"
            >
              <Sparkles className={`w-4 h-4 ${isAnimating ? 'animate-pulse' : ''}`} />
              Generate a Topic for Me
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
