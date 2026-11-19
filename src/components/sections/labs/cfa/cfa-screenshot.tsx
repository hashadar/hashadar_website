'use client';

import { useEffect, useState } from 'react';
import { cfa } from '@/data';
import { fill } from '@/lib/cfa/format';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import { cfaLinkClassName, cfaMutedClassName } from '@/components/sections/labs/cfa/cfa-ui';

export type CfaScreenshotProps = {
  storageKey: string;
  index: number;
  /** A local object URL for a screenshot that is still being captured. */
  localUrl?: string;
};

/** A private screenshot through a short-lived signed URL, with a link to the original. */
export function CfaScreenshot({ storageKey, index, localUrl }: CfaScreenshotProps) {
  const { lab } = useCfa();
  const [url, setUrl] = useState<string | null>(localUrl ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (localUrl || !lab) return;
    let cancelled = false;
    lab.screenshots
      .getUrl(storageKey)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lab, localUrl, storageKey]);

  const alt = fill(cfa.capture.screenshotAlt, { index: index + 1 });

  if (failed) {
    return <p className={cfaMutedClassName}>{cfa.common.errorLabel}</p>;
  }
  if (!url) {
    return <p className={cfaMutedClassName}>{cfa.common.loadingLabel}</p>;
  }

  return (
    <figure className="space-y-1.5">
      {/* Signed S3 URLs change on every load; next/image optimisation adds nothing here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="w-full rounded-md border border-[var(--border)] bg-white object-contain"
      />
      <figcaption>
        <a href={url} target="_blank" rel="noreferrer" className={cfaLinkClassName}>
          {fill(cfa.questionDetail.openScreenshotLabel, { index: index + 1 })}
        </a>
      </figcaption>
    </figure>
  );
}
