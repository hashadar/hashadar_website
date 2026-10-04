import { wmw } from '@/data';
import { formatGbp } from '@/lib/wmw/format';
import { cn } from '@/lib/utils';

export type WmwPairSublineProps = {
  assetTotal: number;
  liabilityTotal: number;
  className?: string;
};

/** "Asset £77,000 less liability £47,000", flagged when equity is negative. */
export function WmwPairSubline({
  assetTotal,
  liabilityTotal,
  className,
}: WmwPairSublineProps) {
  const copy = wmw.overview;
  const negative = assetTotal - liabilityTotal < 0;
  const breakdown = `${copy.pairAssetLabel} ${formatGbp(assetTotal)} ${copy.pairLessLabel} ${copy.pairLiabilityLabel} ${formatGbp(liabilityTotal)}`;
  return (
    <span
      className={cn(
        'block font-body text-xs text-[var(--mono-500)]',
        className,
      )}
    >
      {negative ? `${copy.negativeEquityLabel}: ${breakdown}` : breakdown}
    </span>
  );
}
