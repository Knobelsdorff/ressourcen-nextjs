import React from 'react';
import Image from 'next/image';

interface IdealFamilyIconProps {
  size?: number;
  className?: string;
}

const IdealFamilyIconFinal: React.FC<IdealFamilyIconProps> = ({ 
  size = 24, 
  className = "" 
}) => {
  return (
    <div 
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/icons/ideal-family-optimized.png"
        alt="Ideal-Großfamilie"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  );
};

export default IdealFamilyIconFinal;
