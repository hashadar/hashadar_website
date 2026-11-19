import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CfaCapture } from '@/components/sections/labs/cfa/cfa-capture';
import { createTestLab, renderWithLab } from '@/components/sections/labs/cfa/cfa-test-utils';
import { cfa } from '@/data';
import { parseExtractionOutput } from '@/lib/cfa/extraction';
import { CAPTURE_DEFAULTS_STORAGE_KEY } from '@/lib/cfa/capture';

vi.mock('@/lib/cfa/prepare-screenshot', () => ({
  prepareScreenshot: vi.fn(async (file: File) => ({
    blob: file,
    contentType: 'image/png',
    extension: 'png',
  })),
}));

beforeEach(() => {
  window.localStorage.clear();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => cleanup());

const placeholderExtraction = parseExtractionOutput({
  questions: [
    {
      stem: 'Placeholder widget question?',
      options: { A: 'One', B: 'Two', C: 'Three' },
      answer: null,
      explanation: null,
      suggestedLos: 'placeholder outcome',
      calculator: null,
    },
  ],
});

describe('CfaCapture', () => {
  it('uploads screenshots, extracts, and saves a confirmed Question with its screenshots', async () => {
    const user = userEvent.setup();
    const extract = vi.fn(async () => placeholderExtraction);
    const { lab, store, screenshots } = createTestLab({}, { extract });
    renderWithLab(<CfaCapture />, lab);

    const moduleSelect = await screen.findByLabelText(cfa.capture.moduleLabel);
    const secondModule = cfa.syllabus.modules[2];
    await user.selectOptions(moduleSelect, secondModule.id);
    await user.type(screen.getByLabelText(cfa.capture.sourceLabel), 'Placeholder set');

    const file = new File(['png'], 'shot.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(cfa.capture.addScreenshotsLabel, { selector: 'input' }), file);
    expect(screen.getByAltText('Screenshot 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: cfa.capture.extractLabel }));

    expect(await screen.findByText(cfa.form.answerMissingNote)).toBeInTheDocument();
    expect(extract).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleName: secondModule.name,
        screenshotKeys: [expect.stringMatching(/^screenshots\/capture-[^/]+\/1\.png$/)],
      }),
    );
    expect(screenshots.objects.size).toBe(1);

    await user.click(screen.getByRole('radio', { name: /Two/ }));
    await user.click(screen.getByRole('checkbox', { name: /correct answer is B/ }));
    await user.click(screen.getByRole('button', { name: cfa.form.saveLabel }));

    expect(await screen.findByText(cfa.capture.savedLabel)).toBeInTheDocument();
    const [saved] = await store.listQuestions();
    expect(saved).toMatchObject({
      module: secondModule.id,
      reading: secondModule.readings[0].id,
      answer: 'B',
      los: 'placeholder outcome',
      source: 'Placeholder set',
      screenshotKeys: [expect.stringMatching(/^screenshots\//)],
    });

    // The next capture starts from the same Module, Reading and source.
    expect(screen.getByLabelText(cfa.capture.moduleLabel)).toHaveValue(secondModule.id);
    expect(screen.getByLabelText(cfa.capture.sourceLabel)).toHaveValue('Placeholder set');
    expect(JSON.parse(window.localStorage.getItem(CAPTURE_DEFAULTS_STORAGE_KEY) ?? '{}')).toMatchObject({
      moduleId: secondModule.id,
      source: 'Placeholder set',
    });
  });

  it('adds a pasted screenshot', async () => {
    const { lab } = createTestLab();
    renderWithLab(<CfaCapture />, lab);
    await screen.findByLabelText(cfa.capture.moduleLabel);

    const file = new File(['png'], 'pasted.png', { type: 'image/png' });
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] },
    });
    window.dispatchEvent(event);

    await waitFor(() => expect(screen.getByAltText('Screenshot 1')).toBeInTheDocument());
    expect(event.defaultPrevented).toBe(true);
  });

  it('removes uploaded screenshots when the capture is abandoned', async () => {
    const user = userEvent.setup();
    const extract = vi.fn(async () => ({ ok: false as const, error: 'Model unavailable' }));
    const { lab, screenshots } = createTestLab({}, { extract });
    renderWithLab(<CfaCapture />, lab);

    const file = new File(['png'], 'shot.png', { type: 'image/png' });
    await user.upload(
      await screen.findByLabelText(cfa.capture.addScreenshotsLabel, { selector: 'input' }),
      file,
    );
    await user.click(screen.getByRole('button', { name: cfa.capture.extractLabel }));
    expect(await screen.findByText('Model unavailable')).toBeInTheDocument();
    expect(screenshots.objects.size).toBe(1);

    await user.click(screen.getByRole('button', { name: cfa.capture.discardLabel }));
    await waitFor(() => expect(screenshots.objects.size).toBe(0));
  });
});
