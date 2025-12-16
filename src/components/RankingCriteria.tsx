import { motion } from 'framer-motion';
import { Award, ChevronDown, ChevronUp, Mic, Brain, BookOpen } from 'lucide-react';
import { useState } from 'react';

const levels = [
  {
    level: 1,
    name: 'Beginner',
    description: 'Speaks with hesitation. Heavy reliance on notes. Limited structure. Fear is dominant.',
    focus: 'Clarity, confidence, basic structure.',
    color: 'bg-red-500/10 border-red-500/30 text-red-600',
    badgeColor: 'bg-red-500',
  },
  {
    level: 2,
    name: 'Elementary',
    description: 'Can speak for short durations without freezing. Simple structure. Intro, body, close.',
    focus: 'Reducing fillers, basic eye contact, pacing.',
    color: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
    badgeColor: 'bg-orange-500',
  },
  {
    level: 3,
    name: 'Intermediate',
    description: 'Comfortable in familiar settings. Clear structure and transitions. Can answer basic questions.',
    focus: 'Storytelling, emphasis, audience awareness.',
    color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600',
    badgeColor: 'bg-yellow-500',
  },
  {
    level: 4,
    name: 'Upper-Intermediate',
    description: 'Adapts content to audience. Uses examples, pauses, and variation in tone. Handles interruptions and follow-ups.',
    focus: 'Persuasion, clarity under pressure.',
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
    badgeColor: 'bg-blue-500',
  },
  {
    level: 5,
    name: 'Advanced',
    description: 'Speaks confidently in high-stakes situations. Strong presence. Minimal reliance on slides or notes. Handles Q&A, objections, and tough audiences.',
    focus: 'Influence, credibility, executive communication.',
    color: 'bg-purple-500/10 border-purple-500/30 text-purple-600',
    badgeColor: 'bg-purple-500',
  },
  {
    level: 6,
    name: 'Mastery',
    description: 'Commanding presence. Effortless delivery. Shapes thinking and decisions. Can improvise, persuade, and inspire consistently.',
    focus: 'Impact at scale. Leadership voice.',
    color: 'bg-gold/10 border-gold/30 text-gold',
    badgeColor: 'bg-gold',
  },
];

const evaluationParameters = [
  {
    category: 'Voice Modulation',
    icon: <Mic className="w-5 h-5" />,
    parameters: [
      { name: 'Voice Clarity & Projection', description: 'Audibility and steadiness of voice' },
      { name: 'Tonal Variation', description: 'Pitch changes to emphasize meaning, avoid monotone' },
      { name: 'Pace & Pauses', description: 'Control over speaking speed and effective use of silence' },
      { name: 'Fillers & Verbal Habits', description: 'Frequency of "um", "uh", "like", "you know", repetitive phrases' },
    ],
  },
  {
    category: 'Thought Structure',
    icon: <Brain className="w-5 h-5" />,
    parameters: [
      { name: 'Purpose Articulation', description: 'How clearly the objective is stated upfront' },
      { name: 'Logical Flow', description: 'Ideas progress coherently and easy to follow' },
      { name: 'Signposting', description: 'Explicit cues that help track where the talk is going' },
      { name: 'Closure Strength', description: 'Effectiveness of conclusion or summary' },
    ],
  },
  {
    category: 'Vocabulary',
    icon: <BookOpen className="w-5 h-5" />,
    parameters: [
      { name: 'Sentence Economy', description: 'Short, direct sentences vs rambling' },
      { name: 'Specificity', description: 'Concrete details and examples vs vague language' },
      { name: 'Redundancy Control', description: 'Avoidance of unnecessary repetition' },
      { name: 'Confidence of Phrasing', description: 'Clear, assertive language without excessive hedging' },
      { name: 'Grammar', description: 'Correct tenses, verbs, and grammatical structure' },
    ],
  },
];

export function RankingCriteria() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-6 bg-card rounded-2xl border border-border shadow-card hover:bg-muted/30 transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-gold" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-display font-semibold text-foreground">
                Evaluation Criteria
              </h2>
              <p className="text-sm text-muted-foreground">
                How we assess your speaking skills
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-6 h-6 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          )}
        </motion.button>

        <motion.div
          initial={false}
          animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden"
        >
          <div className="pt-8 space-y-12">
            {/* Proficiency Levels */}
            <div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-6">
                Proficiency Levels
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {levels.map((level, idx) => (
                  <motion.div
                    key={level.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isExpanded ? 1 : 0, y: isExpanded ? 0 : 20 }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className={`p-5 rounded-xl border ${level.color}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-8 h-8 rounded-full ${level.badgeColor} text-white text-sm font-bold flex items-center justify-center`}>
                        {level.level}
                      </span>
                      <h4 className="font-display font-semibold">{level.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{level.description}</p>
                    <p className="text-xs">
                      <span className="font-medium">Focus: </span>
                      <span className="text-muted-foreground">{level.focus}</span>
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Evaluation Parameters */}
            <div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-6">
                Evaluation Parameters
              </h3>
              <div className="grid gap-6 md:grid-cols-3">
                {evaluationParameters.map((category, catIdx) => (
                  <motion.div
                    key={category.category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isExpanded ? 1 : 0, y: isExpanded ? 0 : 20 }}
                    transition={{ duration: 0.4, delay: 0.6 + catIdx * 0.1 }}
                    className="bg-card rounded-xl border border-border p-5"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                        {category.icon}
                      </div>
                      <h4 className="font-display font-semibold text-foreground">
                        {category.category}
                      </h4>
                    </div>
                    <ul className="space-y-3">
                      {category.parameters.map((param) => (
                        <li key={param.name} className="text-sm">
                          <span className="font-medium text-foreground">{param.name}</span>
                          <p className="text-muted-foreground text-xs mt-0.5">{param.description}</p>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export const PROFICIENCY_LEVELS = levels;
