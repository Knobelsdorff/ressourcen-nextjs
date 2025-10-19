import Image from 'next/image';

interface AngelIconFinalProps {
  size?: number;
  className?: string;
}

const AngelIconFinal: React.FC<AngelIconFinalProps> = ({ size = 60, className = '' }) => {
  return (
    <Image
      src="/icons/angel-optimized.png"
      alt="Angel Icon"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
};

export default AngelIconFinal;
