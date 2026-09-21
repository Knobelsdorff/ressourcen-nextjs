"use client";

import { MotionConfig } from 'framer-motion';
import './story-flow.css';

export default function CreateStoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="wellness-theme story-flow">{children}</div>
    </MotionConfig>
  );
}
