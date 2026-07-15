'use client';

import { useId, useRef, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import {
  uploadJobDescription as defaultUploadJobDescription,
  validateJobDescriptionMarkdown,
  type UploadJobDescriptionResult,
} from '@/lib/job-market-lab';
import { cn } from '@/lib/utils';

export type CorpusUploadFn = (input: {
  fileName: string;
  body: string;
}) => Promise<UploadJobDescriptionResult>;

export type IngestQueueItem = {
  id: string;
  fileName: string;
  status: 'queued' | 'validating' | 'uploading' | 'uploaded' | 'rejected';
  reason?: string;
  s3Key?: string;
};

export type JobMarketCorpusIngestToolbarProps = {
  uploadJobDescription?: CorpusUploadFn;
  onUploaded?: (s3Key: string) => void | Promise<void>;
  onOpenEmployers?: () => void;
};

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function queueStatusLabel(
  status: IngestQueueItem['status'],
  copy: (typeof jobMarketLab)['console']['corpusWorkspace'],
): string {
  switch (status) {
    case 'queued':
      return copy.ingestQueued;
    case 'validating':
      return copy.ingestValidating;
    case 'uploading':
      return copy.ingestUploading;
    case 'uploaded':
      return copy.ingestUploaded;
    case 'rejected':
      return copy.ingestRejected;
  }
}

export function JobMarketCorpusIngestToolbar({
  uploadJobDescription = defaultUploadJobDescription,
  onUploaded,
  onOpenEmployers,
}: JobMarketCorpusIngestToolbarProps) {
  const copy = jobMarketLab.console.corpusWorkspace;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<IngestQueueItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  async function processFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) =>
      file.name.toLowerCase().endsWith('.md'),
    );
    if (list.length === 0) {
      return;
    }

    const seeded: IngestQueueItem[] = list.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      fileName: file.name,
      status: 'queued',
    }));
    setQueue(seeded);
    setIsBusy(true);

    let lastUploadedKey: string | undefined;

    for (let index = 0; index < list.length; index += 1) {
      const file = list[index];
      const itemId = seeded[index].id;

      setQueue((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, status: 'validating' } : item,
        ),
      );

      const body = await readFileAsText(file);
      const validation = validateJobDescriptionMarkdown(body);
      if (validation.status === 'rejected') {
        setQueue((current) =>
          current.map((item) =>
            item.id === itemId
              ? { ...item, status: 'rejected', reason: validation.reason }
              : item,
          ),
        );
        continue;
      }

      setQueue((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, status: 'uploading' } : item,
        ),
      );

      const result = await uploadJobDescription({
        fileName: file.name,
        body,
      });

      if (result.status === 'rejected') {
        setQueue((current) =>
          current.map((item) =>
            item.id === itemId
              ? { ...item, status: 'rejected', reason: result.reason }
              : item,
          ),
        );
        continue;
      }

      lastUploadedKey = result.s3Key;
      setQueue((current) =>
        current.map((item) =>
          item.id === itemId
            ? { ...item, status: 'uploaded', s3Key: result.s3Key }
            : item,
        ),
      );
    }

    setIsBusy(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (lastUploadedKey && onUploaded) {
      await onUploaded(lastUploadedKey);
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-[var(--border)] border-l-4 border-l-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_3%,var(--background))] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <Heading as="h3" size="sm">
            {copy.ingestHeading}
          </Heading>
          <Text variant="muted" size="sm">
            {copy.ingestDescription}
          </Text>
        </div>
        {onOpenEmployers ? (
          <Button type="button" variant="outline" onClick={onOpenEmployers}>
            {copy.employersButtonLabel}
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          'rounded-md border border-dashed border-[var(--border)] px-4 py-6 text-center transition-colors',
          'hover:border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_5%,transparent)]',
          isDragging &&
            'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] ring-2 ring-[color-mix(in_oklab,var(--primary)_30%,transparent)]',
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void processFiles(event.dataTransfer.files);
        }}
      >
        <label htmlFor={inputId} className="cursor-pointer font-body text-sm text-[var(--foreground)]">
          {isBusy ? copy.ingestUploadingLabel : copy.ingestDropLabel}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".md,text/markdown"
          multiple
          className="sr-only"
          disabled={isBusy}
          aria-label={copy.ingestFileLabel}
          onChange={(event) => {
            if (event.target.files) {
              void processFiles(event.target.files);
            }
          }}
        />
      </div>

      {queue.length > 0 ? (
        <div className="space-y-2">
          <Text size="sm">{copy.ingestQueueHeading}</Text>
          <ul className="space-y-1">
            {queue.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-[var(--foreground)]"
              >
                <span className="font-medium">{item.fileName}</span>
                <span
                  className={cn(
                    'inline-flex rounded px-1.5 py-0.5 text-xs font-medium',
                    item.status === 'uploaded'
                      ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]'
                      : item.status === 'rejected'
                        ? 'bg-[var(--muted)] text-[var(--mono-500)]'
                        : 'bg-[color-mix(in_oklab,var(--primary)_6%,transparent)] text-[var(--mono-600)]',
                  )}
                >
                  {queueStatusLabel(item.status, copy)}
                </span>
                {item.reason ? (
                  <span role="status" className="text-[var(--mono-500)]">
                    {item.reason}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
