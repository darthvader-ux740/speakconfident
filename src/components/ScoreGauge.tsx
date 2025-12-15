import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
}

export function ScoreGauge({ score, label, size = 'md', delay = 0 }: ScoreGaugeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success';
    if (score >= 6) return 'text-gold';
    if (score >= 4) return 'text-warning';
    return 'text-destructive';
  };

  const getStrokeColor = (score: number) => {
    if (score >= 8) return 'stroke-success';
    if (score >= 6) return 'stroke-gold';
    if (score >= 4) return 'stroke-warning';
    return 'stroke-destructive';
  };

  const sizeConfig = {
    sm: { container: 'w-16 h-16', stroke: 4, text: 'text-lg', label: 'text-xs' },
    md: { container: 'w-24 h-24', stroke: 6, text: 'text-2xl', label: 'text-sm' },
    lg: { container: 'w-32 h-32', stroke: 8, text: 'text-4xl', label: 'text-base' },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 10) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={cn("relative", config.container)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay }}
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth={config.stroke}
            className="stroke-muted"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            className={getStrokeColor(score)}
            initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
          />
        </svg>
        
        {/* Score text */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: delay + 0.5 }}
        >
          <span className={cn("font-display font-bold", config.text, getScoreColor(score))}>
            {score.toFixed(1)}
          </span>
        </motion.div>
      </motion.div>
      
      <motion.p
        className={cn("text-muted-foreground font-medium text-center", config.label)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: delay + 0.6 }}
      >
        {label}
      </motion.p>
    </div>
  );
}
