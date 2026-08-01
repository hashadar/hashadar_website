import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { Schema } from '../../data/resource';

const client = new BedrockRuntimeClient({});

const SYSTEM_PROMPT = `You are analysing job-hunt fit for a private Site Admin.
Given a Hunt Profile (structured targets/constraints plus optional Body), an Opportunity (structured listing evidence plus optional Body), and an Employer (structured fields plus optional Body), return ONLY valid JSON with this shape:
{"summary":string,"advantages":string[],"disadvantages":string[],"fitNotes":string[],"gaps":string[]}
Use British English. Be concise and concrete. Do not invent Decision Events or Pass/Pursue recommendations.`;

function extractText(response: {
  output?: { message?: { content?: Array<{ text?: string }> } };
}): string {
  const parts = response.output?.message?.content ?? [];
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

function coerceJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  JSON.parse(candidate);
  return candidate;
}

export const handler: Schema['analyseFitWithBedrock']['functionHandler'] =
  async (event) => {
    const modelId =
      process.env.BEDROCK_MODEL_ID ??
      'anthropic.claude-3-haiku-20240307-v1:0';
    const contextJson = event.arguments.contextJson;

    const response = await client.send(
      new ConverseCommand({
        modelId,
        system: [{ text: SYSTEM_PROMPT }],
        messages: [
          {
            role: 'user',
            content: [
              {
                text: `Analyse fit for this context JSON:\n${contextJson}`,
              },
            ],
          },
        ],
        inferenceConfig: {
          maxTokens: 1200,
          temperature: 0.2,
        },
      }),
    );

    return coerceJson(extractText(response));
  };
