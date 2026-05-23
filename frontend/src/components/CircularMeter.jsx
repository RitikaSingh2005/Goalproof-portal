import React from 'react';
import { motion } from 'framer-motion';

const CircularMeter = ({ score }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = 'text-red-500';
  let glowClass = 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
  
  if (score >= 70) {
    colorClass = 'text-green-500';
    glowClass = 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]';
  } else if (score >= 50) {
    colorClass = 'text-yellow-500';
    glowClass = 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]';
  }

  return (
    <div className="relative inline-flex items-center justify-center group">
      {/* Background ambient glow */}
      <div className={`absolute inset-0 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${colorClass.replace('text-', 'bg-')}`}></div>
      
      <svg className="transform -rotate-90 w-20 h-20 relative z-10">
        {/* Background track */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-white/5"
        />
        {/* Animated foreground progress */}
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`${colorClass} ${glowClass}`}
        />
      </svg>
      
      {/* Centered text */}
      <div className="absolute flex flex-col items-center justify-center z-10">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className={`text-xl font-display font-bold ${colorClass}`}
        >
          {score || 0}
        </motion.span>
      </div>
    </div>
  );
};

export default CircularMeter;
