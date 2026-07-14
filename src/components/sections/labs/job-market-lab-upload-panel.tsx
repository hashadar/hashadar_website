'use client';

import { useRef, useState } from 'react';
import { Button, Heading, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import {
  uploadJobDescription as defaultUploadJobDescription,
  validateJobDescriptionMarkdown,
  type UploadJobDescriptionResult,
} from '@/lib/job-market-lab';

export type UploadJobDescriptionFn = (
  input: { fileName: string; body: string },
) => Promise<UploadJobDescriptionResult>;

export type JobMarketLabUploadPanelProps = {
  uploadJobDescription?: UploadJobDescriptionFn;
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

export function JobMarketLabUploadPanel({
  uploadJobDescription = defaultUploadJobDescription,
}: JobMarketLabUploadPanelProps) {
  const { session, isLoading } = useSiteAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadJobDescriptionResult | null>(null);

  if (isLoading || session === null || session.status !== 'authenticated') {
    return null;
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setResult({ status: 'rejected', reason: jobMarketLab.upload.noFileSelected });
      return;
    }

    setIsUploading(true);
    setResult(null);

    const body = await readFileAsText(file);
    const validation = validateJobDescriptionMarkdown(body);
    if (validation.status === 'rejected') {
      setResult(validation);
      setIsUploading(false);
      return;
    }

    const next = await uploadJobDescription({
      fileName: file.name,
      body,
    });

    setResult(next);
    setIsUploading(false);

    if (next.status === 'uploaded' && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <section className="mt-16 space-y-6" aria-labelledby="job-market-upload-heading">
      <div className="max-w-2xl space-y-4">
        <SectionHeader
          id="job-market-upload-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent={false}
        >
          {jobMarketLab.upload.heading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.upload.description}</Text>
      </div>

      <div className="max-w-2xl space-y-4">
        <label className="block space-y-2" htmlFor="job-market-upload-file">
          <Text size="sm">{jobMarketLab.upload.fileLabel}</Text>
          <input
            ref={fileInputRef}
            id="job-market-upload-file"
            type="file"
            accept=".md,text/markdown"
            className="block w-full font-body text-base text-[var(--foreground)]"
          />
        </label>

        <Button
          type="button"
          onClick={() => void handleUpload()}
          disabled={isUploading}
        >
          {isUploading
            ? jobMarketLab.upload.uploadingLabel
            : jobMarketLab.upload.uploadButtonLabel}
        </Button>
      </div>

      {result?.status === 'uploaded' ? (
        <p role="status" className="font-body text-base leading-relaxed text-[var(--foreground)]">
          {jobMarketLab.upload.uploadedMessage.replace('{s3Key}', result.s3Key)}
        </p>
      ) : null}

      {result?.status === 'rejected' ? (
        <div role="alert" className="space-y-2">
          <Heading as="h3" size="sm">
            {jobMarketLab.upload.rejectedHeading}
          </Heading>
          <Text>{result.reason}</Text>
        </div>
      ) : null}
    </section>
  );
}
