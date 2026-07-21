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
  onUploaded?: () => void;
};

type UploadBatchResult =
  | { status: 'uploaded'; s3Keys: string[] }
  | { status: 'rejected'; reason: string; uploadedS3Keys?: string[] };

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
  onUploaded,
}: JobMarketLabUploadPanelProps) {
  const { session, isLoading } = useSiteAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadBatchResult | null>(null);

  if (isLoading || session === null || session.status !== 'authenticated') {
    return null;
  }

  async function handleUpload() {
    const files = fileInputRef.current?.files
      ? Array.from(fileInputRef.current.files)
      : [];
    if (files.length === 0) {
      setResult({ status: 'rejected', reason: jobMarketLab.upload.noFileSelected });
      return;
    }

    setIsUploading(true);
    setResult(null);

    const uploadedS3Keys: string[] = [];

    for (const file of files) {
      const body = await readFileAsText(file);
      const validation = validateJobDescriptionMarkdown(body);
      if (validation.status === 'rejected') {
        setResult({
          status: 'rejected',
          reason: `${file.name}: ${validation.reason}`,
          uploadedS3Keys: uploadedS3Keys.length > 0 ? uploadedS3Keys : undefined,
        });
        setIsUploading(false);
        if (uploadedS3Keys.length > 0) {
          onUploaded?.();
        }
        return;
      }

      const next = await uploadJobDescription({
        fileName: file.name,
        body,
      });

      if (next.status === 'rejected') {
        setResult({
          status: 'rejected',
          reason: `${file.name}: ${next.reason}`,
          uploadedS3Keys: uploadedS3Keys.length > 0 ? uploadedS3Keys : undefined,
        });
        setIsUploading(false);
        if (uploadedS3Keys.length > 0) {
          onUploaded?.();
        }
        return;
      }

      uploadedS3Keys.push(next.s3Key);
    }

    setResult({ status: 'uploaded', s3Keys: uploadedS3Keys });
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUploaded?.();
  }

  const uploadedMessage =
    result?.status === 'uploaded'
      ? result.s3Keys.length === 1
        ? jobMarketLab.upload.uploadedMessage.replace('{s3Key}', result.s3Keys[0]!)
        : jobMarketLab.upload.uploadedManyMessage
            .replace('{count}', String(result.s3Keys.length))
            .replace('{s3Keys}', result.s3Keys.join(', '))
      : null;

  return (
    <section className="space-y-4" aria-labelledby="job-market-upload-heading">
      <div className="max-w-2xl space-y-2">
        <SectionHeader
          id="job-market-upload-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent={false}
        >
          {jobMarketLab.upload.heading}
        </SectionHeader>
        <Text size="sm" variant="muted">
          {jobMarketLab.upload.description}
        </Text>
      </div>

      <div className="max-w-2xl space-y-3">
        <label className="block space-y-2" htmlFor="job-market-upload-file">
          <Text size="sm">{jobMarketLab.upload.fileLabel}</Text>
          <input
            ref={fileInputRef}
            id="job-market-upload-file"
            type="file"
            accept=".md,text/markdown"
            multiple
            className="block w-full font-body text-sm text-[var(--foreground)]"
          />
        </label>

        <Button
          type="button"
          size="sm"
          onClick={() => void handleUpload()}
          disabled={isUploading}
        >
          {isUploading
            ? jobMarketLab.upload.uploadingLabel
            : jobMarketLab.upload.uploadButtonLabel}
        </Button>
      </div>

      {uploadedMessage ? (
        <p
          role="status"
          className="font-body text-sm leading-relaxed text-[var(--foreground)]"
        >
          {uploadedMessage}
        </p>
      ) : null}

      {result?.status === 'rejected' ? (
        <div role="alert" className="space-y-2">
          <Heading as="h3" size="sm">
            {jobMarketLab.upload.rejectedHeading}
          </Heading>
          <Text size="sm">{result.reason}</Text>
          {result.uploadedS3Keys && result.uploadedS3Keys.length > 0 ? (
            <Text size="sm" variant="muted">
              {jobMarketLab.upload.partialUploadMessage.replace(
                '{s3Keys}',
                result.uploadedS3Keys.join(', '),
              )}
            </Text>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
