"use client";

import { MotionConfig } from 'framer-motion';

export default function WellnessSurface({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`wellness-theme wellness-surface ${className}`}>{children}</div>
    </MotionConfig>
  );
}
