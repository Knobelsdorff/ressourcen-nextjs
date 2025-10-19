import React from 'react';

interface IdealFamilyIconProps {
  size?: number;
  className?: string;
}

const IdealFamilyIcon: React.FC<IdealFamilyIconProps> = ({ 
  size = 24, 
  className = "" 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Großvater (oben links) */}
      <circle cx="16" cy="12" r="6" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
      <rect x="13" y="18" width="6" height="8" fill="#4A90E2" stroke="#2E5BBA" strokeWidth="1"/>
      
      {/* Großmutter (oben rechts) */}
      <circle cx="48" cy="12" r="6" fill="#D4AF37" stroke="#B8860B" strokeWidth="1"/>
      <rect x="45" y="18" width="6" height="8" fill="#E91E63" stroke="#C2185B" strokeWidth="1"/>
      
      {/* Vater (mitte links) */}
      <circle cx="20" cy="28" r="5" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
      <rect x="17" y="33" width="6" height="10" fill="#2196F3" stroke="#1976D2" strokeWidth="1"/>
      
      {/* Mutter (mitte rechts) */}
      <circle cx="44" cy="28" r="5" fill="#D4AF37" stroke="#B8860B" strokeWidth="1"/>
      <rect x="41" y="33" width="6" height="10" fill="#FF5722" stroke="#E64A19" strokeWidth="1"/>
      
      {/* Kind 1 (unten links) */}
      <circle cx="18" cy="48" r="4" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
      <rect x="16" y="52" width="4" height="6" fill="#4CAF50" stroke="#388E3C" strokeWidth="1"/>
      
      {/* Kind 2 (unten mitte) */}
      <circle cx="32" cy="48" r="4" fill="#D4AF37" stroke="#B8860B" strokeWidth="1"/>
      <rect x="30" y="52" width="4" height="6" fill="#FF9800" stroke="#F57C00" strokeWidth="1"/>
      
      {/* Kind 3 (unten rechts) */}
      <circle cx="46" cy="48" r="4" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
      <rect x="44" y="52" width="4" height="6" fill="#9C27B0" stroke="#7B1FA2" strokeWidth="1"/>
      
      {/* Herz-Symbol (in der Mitte) */}
      <path 
        d="M32 20 C32 20, 28 16, 24 16 C20 16, 20 20, 20 24 C20 28, 32 36, 32 36 C32 36, 44 28, 44 24 C44 20, 44 16, 40 16 C36 16, 32 20, 32 20 Z" 
        fill="#FF6B6B" 
        stroke="#E53E3E" 
        strokeWidth="1"
      />
    </svg>
  );
};

export default IdealFamilyIcon;
