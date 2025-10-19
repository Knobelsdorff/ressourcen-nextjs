import Image from 'next/image';

interface ArchangelMichaelIconFinalProps {
  size?: number;
  className?: string;
}

const ArchangelMichaelIconFinal: React.FC<ArchangelMichaelIconFinalProps> = ({ size = 48, className = '' }) => {
  return (
    <Image
      src="/icons/archangel-michael-optimized.png"
      alt="Archangel Michael Icon"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
};

export default ArchangelMichaelIconFinal;
