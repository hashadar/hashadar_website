import type { ToolConfiguration } from '@aws-sdk/client-bedrock-runtime';
import type { DocumentType } from '@smithy/types';
import type { ExtractedJobDescription } from './assemble-markdown';
import {
  COMPENSATION_DISCLOSURES,
  COMPENSATION_PERIODS,
  JOB_DESCRIPTION_ROLE_FAMILIES,
  JOB_DESCRIPTION_SENIORITIES,
  normaliseExtraction,
} from './assemble-markdown';

/** Rough on-demand rates for cost logging only (not billed exactly). */
export const PARSE_INPUT_USD_PER_MILLION = 0.15;
export const PARSE_OUTPUT_USD_PER_MILLION = 0.6;

export const EXTRACT_TOOL_NAME = 'extract_job_description';

export const SYSTEM_PROMPT = [
  'Extract a structured job description from career-page plain text.',
  'Map seniority and roleFamily only to the allowed enums; omit them when unsure.',
  'For compensationDisclosure: use range when a numeric salary or day-rate band is stated;',
  'use competitive for phrases such as competitive, DOE, negotiable, or attractive package;',
  'use unknown when pay is not mentioned.',
  'When disclosure is range, also extract currency (ISO-like code), min, max, and period when present;',
  'omit numeric pay fields for competitive or unknown.',
  'Do not invent employer marketing fluff; keep the body faithful to the listing.',
  'Leave source unset — the owner will tag it later.',
  'Call the extract_job_description tool exactly once.',
].join(' ');

export type BedrockUsage = {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

export type BedrockExtractResult =
  | { status: 'ok'; extraction: ExtractedJobDescription; usage: BedrockUsage }
  | { status: 'extract_failed'; reason: string; usage?: BedrockUsage };

export type ConverseToolUseBlock = {
  toolUse?: {
    name?: string;
    input?: unknown;
  };
};

export type ConverseResponse = {
  output?: {
    message?: {
      content?: ConverseToolUseBlock[];
    };
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type ConverseFn = (input: {
  modelId: string;
  system: Array<{ text: string }>;
  messages: Array<{ role: 'user'; content: Array<{ text: string }> }>;
  inferenceConfig: { temperature: number; maxTokens: number };
  toolConfig: ToolConfiguration;
}) => Promise<ConverseResponse>;

export function estimateParseCostUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    (inputTokens / 1_000_000) * PARSE_INPUT_USD_PER_MILLION +
    (outputTokens / 1_000_000) * PARSE_OUTPUT_USD_PER_MILLION
  );
}

/** @deprecated Use estimateParseCostUsd */
export const estimateHaikuCostUsd = estimateParseCostUsd;

function usageFromResponse(response: ConverseResponse): BedrockUsage {
  const inputTokens = response.usage?.inputTokens ?? 0;
  const outputTokens = response.usage?.outputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    estimatedCostUsd: estimateParseCostUsd(inputTokens, outputTokens),
  };
}

export function buildExtractToolSchema(): DocumentType {
  return {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Job title from the listing' },
      seniority: {
        type: 'string',
        enum: [...JOB_DESCRIPTION_SENIORITIES],
      },
      roleFamily: {
        type: 'string',
        enum: [...JOB_DESCRIPTION_ROLE_FAMILIES],
      },
      compensationDisclosure: {
        type: 'string',
        enum: [...COMPENSATION_DISCLOSURES],
        description:
          'range for numeric bands; competitive for DOE/negotiable/attractive package; unknown when pay is absent',
      },
      compensationCurrency: {
        type: 'string',
        description: 'ISO-like currency code when disclosure is range (e.g. GBP, USD)',
      },
      compensationMin: {
        type: 'number',
        description: 'Lower bound of the stated pay band when disclosure is range',
      },
      compensationMax: {
        type: 'number',
        description: 'Upper bound of the stated pay band when disclosure is range',
      },
      compensationPeriod: {
        type: 'string',
        enum: [...COMPENSATION_PERIODS],
      },
      body: {
        type: 'string',
        description: 'Cleaned markdown-friendly job description body',
      },
    },
    required: ['title', 'body', 'compensationDisclosure'],
    additionalProperties: false,
  };
}

export function buildExtractToolConfig(): ToolConfiguration {
  return {
    tools: [
      {
        toolSpec: {
          name: EXTRACT_TOOL_NAME,
          description:
            'Return the structured job description extracted from the page text.',
          inputSchema: { json: buildExtractToolSchema() },
        },
      },
    ],
    // Specific tool forcing is Anthropic/Nova-only; auto works across Qwen/Llama/Mistral.
    toolChoice: { auto: {} },
  };
}

export async function extractJobDescriptionWithBedrock(
  input: { pageText: string; hostname: string; modelId: string },
  converse: ConverseFn,
): Promise<BedrockExtractResult> {
  let response: ConverseResponse;
  try {
    response = await converse({
      modelId: input.modelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: 'user',
          content: [
            {
              text: [
                `Listing hostname (hint only): ${input.hostname}`,
                'Page plain text:',
                input.pageText,
              ].join('\n\n'),
            },
          ],
        },
      ],
      inferenceConfig: {
        temperature: 0,
        maxTokens: 4096,
      },
      toolConfig: buildExtractToolConfig(),
    });
  } catch (error) {
    return {
      status: 'extract_failed',
      reason: error instanceof Error ? error.message : 'Bedrock Converse failed',
    };
  }

  const usage = usageFromResponse(response);
  const toolBlock = response.output?.message?.content?.find(
    (block) => block.toolUse?.name === EXTRACT_TOOL_NAME,
  );
  const extraction = normaliseExtraction(toolBlock?.toolUse?.input);
  if (!extraction) {
    return {
      status: 'extract_failed',
      reason: 'Model did not return a valid extract_job_description payload',
      usage,
    };
  }

  return { status: 'ok', extraction, usage };
}
