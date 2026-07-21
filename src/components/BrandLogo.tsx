import type { ImgHTMLAttributes } from "react";

type BrandLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  alt?: string;
};

export function BrandLogo({
  alt = "Beginner",
  className = "h-6 w-auto",
  ...props
}: BrandLogoProps) {
  return <img src="/beginner-logo.png" alt={alt} className={className} {...props} />;
}
