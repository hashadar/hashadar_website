import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const libDir = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath: string): string {
  return readFileSync(join(libDir, relativePath), 'utf8');
}

describe('recompute path LLM isolation', () => {
  it('does not invoke scrape LLM assist from the recompute client', () => {
    const source = readSource('./start-job-market-recompute-client.ts');

    expect(source).not.toMatch(/assistWithLlm|defaultAssistWithLlm|scrape-candidates-llm-assist/);
  });

  it('does not invoke scrape LLM assist from the recompute orchestrator', () => {
    const source = readSource('../../amplify/functions/job-market-recompute/orchestrator.ts');

    expect(source).not.toMatch(/assistWithLlm|defaultAssistWithLlm|scrape-candidates-llm-assist/);
  });
});
