import type {
  CareerProfile,
  CertificationsSection,
  EducationSection,
  ExperienceSection,
} from '@/data/types';
import { getAboutCertificationsView } from './certifications-slices';
import { getAboutEducationView } from './education-slices';
import { getAboutExperienceView } from './experience-slices';

export interface AboutCareerViews {
  experience: ExperienceSection;
  education: EducationSection;
  certifications: CertificationsSection;
}

export function getAboutCareerViews(profile: CareerProfile): AboutCareerViews {
  return {
    experience: getAboutExperienceView(profile),
    education: getAboutEducationView(profile),
    certifications: getAboutCertificationsView(profile),
  };
}
