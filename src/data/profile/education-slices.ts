import type { CareerProfile, EducationSection } from '@/data/types';

export function getAboutEducationView(profile: CareerProfile): EducationSection {
  return {
    heading: 'education',
    entries: profile.education.entries,
  };
}
