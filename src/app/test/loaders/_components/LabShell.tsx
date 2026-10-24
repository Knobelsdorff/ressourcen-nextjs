"use client";

import { MotionConfig } from 'framer-motion';

// Gleicher Rahmen wie src/app/create-story/layout.tsx, damit die Mock-Ansicht
// exakt dieselben Styles bekommt.
export default function LabShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="wellness-theme story-flow">{children}</div>
    </MotionConfig>
  );
}
