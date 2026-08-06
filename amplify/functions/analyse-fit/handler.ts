import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { Schema } from '../../data/resource';

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION ?? process.env.AWS_REGION,
});

export const SYSTEM_PROMPT = `You are analysing job-hunt fit for a private Site Admin who already sees structured fields and a structural checklist on the form.

Context JSON includes:
- Hunt Profile (+ optional Body): targets, must-haves, deal-breakers, escape pains, seek desires, experience narrative
- Opportunity (+ optional Body): listing evidence and pasted JD prose
- Employer (+ optional Body): name, sizeTier, prestigeTier, sector, summary, notes, standing prose
- structuralChecklist: deterministic pass/fail/unknown on compensation, seniority, role_family, must_haves, deal_breakers

Return ONLY valid JSON:
{"summary":string,"advantages":string[],"disadvantages":string[],"fitNotes":string[],"gaps":string[]}

Priorities (in order):
1. Hard skill / stack / domain mismatches against Hunt Profile (especially must-haves and Body experience) — these usually dominate Pass/Pursue.
2. Concrete employer + market positioning that changes the trade-off (brand, hiring bar, exit options, consulting vs product, Big 4 vs boutique, bulge-bracket IB vs fintech, etc.).
3. Non-obvious intersections with escape pains / seek desires / Hunt Body.
4. True information gaps that block a decision (team/division, mandate) — never form unknowns already shown as checklist Unknown.

Employer and world knowledge:
- Prefer facts on the Employer record (prestigeTier, sizeTier, sector, summary, notes, Body) when present.
- You MAY use well-established public knowledge about a named employer or sector when it materially changes the judgment (e.g. Goldman Sachs as a top-tier bulge-bracket investment bank; Deloitte as the largest Big Four by revenue). State it specifically, not as vague prestige.
- Do NOT invent contested or obscure claims. If unsure, omit.
- Ban empty prestige padding: never list "prestigious company", "leading firm", "excellent brand", "great growth opportunity", or "high pressure elite environment" as a standalone advantage/disadvantage. Prestige only counts when tied to a hunt desire (e.g. brand for exits, comp leverage, network) or a concrete downside (e.g. slow bureaucracy, tool constraints typical of that firm type).

Do NOT:
- Restate structuralChecklist verdicts in prose (no "role family mismatch", "compensation unclear", "must-haves fail" — those pills are already on the form). You may still reason about the underlying stack/experience conflict in concrete terms.
- Pad with generic JD tropes (cutting-edge, cross-team collaboration, microservices as virtue) unless tied to the hunt profile.
- Recommend Pass or Pursue, or invent Decision Events.

Style:
- British English. Concise. Prefer empty arrays over filler. At most 3 items per array.
- summary: 1–2 sentences — the decisive judgment, usually led by fit/skill conflict, with employer context only if it changes the call.
- advantages / disadvantages: concrete trade-offs.
- fitNotes: non-obvious intersections with hunt Body / escape pains / seek desires.
- gaps: missing decision info not already an Unknown on the form.

Examples of tone (do not copy content; match the standard):

Good summary:
"Stack is a poor match: the listing is Java/Spring/Mongo while the hunt profile is Python data/product engineering, so the role would fight the owner's recent experience despite Goldman Sachs's bulge-bracket brand."

Bad summary:
"The opportunity at a prestigious leading firm may not be the best fit due to role family mismatch and lack of must-haves, but growth opportunities are notable."

Good advantage:
"Bulge-bracket IB brand can strengthen exits into markets/fintech platform roles if that matches seek desires."

Bad advantage:
"Opportunity to work with a leading global investment banking firm."`;

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
      'us.meta.llama3-3-70b-instruct-v1:0';
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
                text: `Analyse fit for this context JSON. Weight Employer fields and Bodies; use established public knowledge about the named employer only when it changes the Pass/Pursue trade-off.\n\n${contextJson}`,
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
