import type { CareerProfile, CertificationsSection } from '@/data/types';

export function getAboutCertificationsView(profile: CareerProfile): CertificationsSection {
  return {
    heading: 'certifications',
    items: profile.certifications.items,
  };
}
