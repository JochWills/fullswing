import Image from "next/image";

/**
 * The academy logo (from logo.png in the project root, background removed).
 * `variant="white"` is for dark backgrounds.
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
      src={variant === "white" ? "/logo-full-white.png" : "/logo-full.png"}
      alt="Full-Swing Tennis Academy"
      width={886}
      height={240}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
