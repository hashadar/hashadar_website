import type { CareerProfile, ExperienceSection } from '@/data/types';

export function getHomeExperienceView(profile: CareerProfile): ExperienceSection {
  return {
    heading: 'Experience',
    companies: profile.experience.companies,
  };
}

export function getAboutExperienceView(profile: CareerProfile): ExperienceSection {
  return {
    heading: 'experience',
    companies: profile.experience.companies,
  };
}
