interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  reviewCount?: number;
  reviewLabel?: string;
}

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function StarRating({
  rating,
  size = "md",
  showValue = true,
  reviewCount,
  reviewLabel,
}: StarRatingProps) {
  const bubbleClass = SIZE_CLASSES[size];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`inline-flex items-center justify-center rounded-full bg-[var(--color-trip-green)] font-bold text-white shadow-sm ${bubbleClass}`}
        aria-label={`Rating ${rating.toFixed(1)} out of 5`}
      >
        {rating.toFixed(1)}
      </div>
      {showValue && (
        <div className="flex flex-col">
          <div className="flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                className={`text-sm ${
                  index < Math.round(rating)
                    ? "text-[var(--color-trip-green)]"
                    : "text-[var(--color-border)]"
                }`}
              >
                ●
              </span>
            ))}
          </div>
          {reviewCount !== undefined && reviewLabel && (
            <span className="text-xs text-[var(--color-muted)]">
              {reviewCount.toLocaleString()} {reviewLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
