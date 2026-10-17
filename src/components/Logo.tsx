import Image from "next/image";

/**
 * The academy logo, vector-traced from public/logo-original.png (artwork unchanged).
 * `variant="white"` is for dark backgrounds; the full-colour version reads best on white.
 */
export default function Logo({
  variant = "color",
  className = "h-12 w-auto",
  priority,
}: {
  variant?: "color" | "white";
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={variant === "white" ? "/logo-white.svg" : "/logo.svg"}
      alt="Full-Swing Tennis Academy"
      width={677}
      height={430}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
