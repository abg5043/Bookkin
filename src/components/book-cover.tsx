import Image from "next/image";

export function BookCover({
  title,
  url,
  priority = false,
  compact = false,
}: {
  title: string;
  url?: string;
  priority?: boolean;
  compact?: boolean;
}) {
  const className = compact ? "bk-cover bk-cover-compact" : "bk-cover";

  if (url === undefined) {
    return (
      <span aria-label={`${title} cover unavailable`} className={`${className} bk-cover-missing`}>
        <span>Cover unavailable</span>
      </span>
    );
  }

  return (
    <span className={className}>
      <Image
        alt={`${title} book cover`}
        fill
        priority={priority}
        sizes={compact ? "48px" : "(max-width: 520px) 42vw, (max-width: 960px) 28vw, 220px"}
        src={url}
      />
    </span>
  );
}
