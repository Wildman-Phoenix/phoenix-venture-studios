import { useEffect, useState } from "react";

const DEFAULT_SIGNAL_IMAGE = `${import.meta.env.BASE_URL}images/signal-default.jpg`;

type PhoenixSignalImageProps = {
  src?: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  loading?: "eager" | "lazy";
};

const PhoenixSignalImage = ({
  src,
  alt,
  fallbackSrc = DEFAULT_SIGNAL_IMAGE,
  className = "",
  loading = "lazy",
}: PhoenixSignalImageProps) => {
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setImageSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`bg-[#0b2a49] ${className}`}
      loading={loading}
      onError={() => {
        if (imageSrc !== fallbackSrc) {
          setImageSrc(fallbackSrc);
        }
      }}
    />
  );
};

export default PhoenixSignalImage;
