import React from 'react';
import Image from 'next/image';

interface JesusIconProps {
  size?: number;
  className?: string;
}

const JesusIconFinal: React.FC<JesusIconProps> = ({ 
  size = 24, 
  className = "" 
}) => {
  return (
    <div 
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/icons/jesus-optimized.png"
        alt="Jesus"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  );
};

export default JesusIconFinal;
