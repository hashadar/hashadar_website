import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EducationListing } from '@/components/sections/shared/education-listing';

describe('EducationListing', () => {
  it('renders a landmark section with an accessible heading for the education entries', () => {
    render(
      <EducationListing
        heading="education"
        entries={[
          {
            institution: 'UCL',
            qualification: 'Mechanical Engineering (MEng)',
            period: 'Sep 2019 - Jul 2023',
            description: 'Third Year Individual Project.',
          },
        ]}
      />,
    );

    const section = document.getElementById('education');
    expect(section).toBeInTheDocument();
    expect(section?.tagName).toBe('SECTION');
    expect(screen.getByRole('heading', { level: 1, name: 'education' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'UCL' })).toBeInTheDocument();
    expect(screen.getByText('Mechanical Engineering (MEng)')).toBeInTheDocument();
  });
});
