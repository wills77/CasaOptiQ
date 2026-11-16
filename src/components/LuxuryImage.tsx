import { useState } from 'react';
import { Glasses } from 'lucide-react';

interface LuxuryImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function LuxuryImage({ src, alt, className = '' }: LuxuryImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EFECE5] text-[#6F6B64] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Glasses className="w-8 h-8 text-[#B89B62] mb-2" strokeWidth={1.25} />
        <span className="text-xs tracking-wide text-[#5C5954] max-w-[180px] truncate">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
