import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { normalisePhone } from '@/lib/court-board/phone';
import { detectCountry, flagEmoji, PhoneInput } from './phone-input';

afterEach(cleanup);

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <PhoneInput label="Mobile number" value={value} onChange={setValue} />;
}

async function typeNumber(text: string) {
  const input = screen.getByLabelText('Mobile number') as HTMLInputElement;
  await userEvent.type(input, text);
  return input;
}

describe('PhoneInput', () => {
  it('is a single telephone input with no country field', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Mobile number');
    expect(input).toHaveAttribute('type', 'tel');
    expect(input).toHaveAttribute('inputmode', 'tel');
    expect(input).toHaveAttribute('autocomplete', 'tel');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('formats as the Player types', async () => {
    render(<Harness />);
    const input = await typeNumber('07400123456');
    expect(input.value).not.toBe('07400123456');
    expect(input.value.replace(/\s/g, '')).toBe('07400123456');
    expect(input.value).toContain(' ');
  });

  it.each(['07400 123456', '+44 7400 123456', '0044 7400123456'])(
    'turns green with a tick and a status when %s is complete',
    async (typed) => {
      render(<Harness />);
      const input = await typeNumber(typed);
      expect(normalisePhone(input.value)).toMatchObject({ ok: true, e164: '+447400123456' });
      expect(screen.getByTestId('phone-valid-tick')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Valid number');
      expect(input.className).toContain('border-[var(--primary)]');
    },
  );

  it('shows neither tick nor status for an incomplete number', async () => {
    render(<Harness />);
    await typeNumber('07400 12');
    expect(screen.queryByTestId('phone-valid-tick')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the detected country flag', async () => {
    render(<Harness />);
    expect(screen.getByTestId('phone-flag')).toHaveTextContent('🌐');
    await typeNumber('07400 123456');
    expect(screen.getByTestId('phone-flag')).toHaveTextContent(flagEmoji('GB'));
  });

  it('lets backspace delete over a space instead of re-adding it', async () => {
    render(<Harness initial="07400 123456" />);
    const input = screen.getByLabelText('Mobile number') as HTMLInputElement;
    await userEvent.type(input, '{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}');
    expect(input.value).toBe('07400 ');
    await userEvent.type(input, '{Backspace}');
    expect(input.value).toBe('07400');
  });
});

describe('detectCountry', () => {
  it('reads a number without a prefix as UK', () => {
    expect(detectCountry('07400 123456')).toBe('GB');
  });

  it('maps +44 numbers to the UK flag even when they could be Crown Dependency ranges', () => {
    expect(detectCountry('+44 7911 123456')).toBe('GB');
  });

  it('detects other countries from an explicit prefix', () => {
    expect(detectCountry('+91 98765 43210')).toBe('IN');
    expect(detectCountry('+353 85 123 4567')).toBe('IE');
  });

  it('has no country before any digit is typed', () => {
    expect(detectCountry('')).toBeNull();
    expect(detectCountry('+')).toBeNull();
  });
});

describe('flagEmoji', () => {
  it('builds regional indicator letters', () => {
    expect(flagEmoji('GB')).toBe('\u{1F1EC}\u{1F1E7}');
    expect(flagEmoji('in')).toBe('\u{1F1EE}\u{1F1F3}');
  });
});
