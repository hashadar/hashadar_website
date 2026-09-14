import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CareerRecord } from '@/components/sections/about/career-record';
import type { AboutCareerViews } from '@/data';

afterEach(() => {
  cleanup();
});

const fixture: AboutCareerViews = {
  current: {
    name: 'Deloitte LLP',
    location: 'London, United Kingdom',
    department: 'Technology & Transformation, AI & Data',
    period: 'since Sep 2024',
    titles: [
      { role: 'Consultant', period: 'since Jun 2026', current: true },
      { role: 'Senior Analyst', period: 'Jun 2025 - May 2026', current: false },
      { role: 'Analyst', period: 'Sep 2024 - May 2025', current: false },
    ],
  },
  earlier: [
    {
      name: 'ALTEN Ltd',
      detail: 'Graduate Business Manager',
      period: 'Jan 2024 - Jul 2024',
    },
    {
      name: 'UCL',
      detail: 'Mechanical Engineering (MEng)',
      period: 'Sep 2019 - Jul 2023',
    },
  ],
  certifications: [
    { name: 'AWS Certified Cloud Practitioner' },
    { name: 'Bloomberg Finance Fundamentals' },
  ],
};

describe('CareerRecord', () => {
  it('renders the current seat as one full-width fold, then a quiet index', () => {
    const { container } = render(<CareerRecord {...fixture} />);

    const sections = container.querySelectorAll('section');
    expect(sections).toHaveLength(1);

    const record = sections[0];
    expect(record.className).toContain('min-h-screen');
    expect(record.className).not.toContain('max-w-3xl');

    expect(within(record).getByRole('heading', { level: 2, name: 'Deloitte LLP' })).toBeInTheDocument();
    expect(within(record).queryByRole('heading', { name: 'experience' })).not.toBeInTheDocument();
    expect(within(record).queryByRole('heading', { name: 'education' })).not.toBeInTheDocument();
    expect(within(record).queryByRole('heading', { name: 'certifications' })).not.toBeInTheDocument();

    expect(within(record).getByText('Technology & Transformation, AI & Data')).toBeInTheDocument();
    expect(within(record).getByText((_, node) => (
      node?.tagName === 'P'
      && node.textContent === 'since Sep 2024 · London, United Kingdom'
    ))).toBeInTheDocument();
    expect(within(record).queryByRole('heading', { name: 'Analyst' })).not.toBeInTheDocument();
    expect(within(record).queryByRole('heading', { name: 'Senior Analyst' })).not.toBeInTheDocument();
    expect(within(record).getByRole('heading', { level: 3, name: 'Consultant' })).toBeInTheDocument();
    expect(within(record).getByText('Analyst')).toBeInTheDocument();
    expect(within(record).getByText('Now')).toBeInTheDocument();

    const timeline = within(record).getByRole('list', { name: 'Roles at Deloitte LLP' });
    const stops = timeline.querySelectorAll('li');
    expect(stops[0]).toHaveAttribute('aria-current', 'true');
    expect(stops[0]?.textContent).toContain('Consultant');
    expect(stops[stops.length - 1]?.textContent).toContain('Analyst');
    expect(within(record).queryByText(/Technology and Transformation/)).not.toBeInTheDocument();

    expect(within(record).getByText('UCL')).toBeInTheDocument();
    expect(within(record).getByText('Mechanical Engineering (MEng)')).toBeInTheDocument();
    expect(within(record).getByText('ALTEN Ltd')).toBeInTheDocument();
    expect(within(record).getByText('AWS Certified Cloud Practitioner')).toBeInTheDocument();
    expect(record.querySelector('#education')).toBeNull();
  });
});
