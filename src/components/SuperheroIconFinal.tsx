import Image from 'next/image';

interface SuperheroIconFinalProps {
  size?: number;
  className?: string;
}

const SuperheroIconFinal: React.FC<SuperheroIconFinalProps> = ({ size = 60, className = '' }) => {
  return (
    <Image
      src="/icons/superhero-optimized.png"
      alt="Superhero Icon"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
};

export default SuperheroIconFinal;
