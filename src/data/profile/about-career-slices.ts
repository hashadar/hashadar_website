import type { CareerProfile, Company, Role } from '@/data/types';

export interface AboutCareerTitle {
  role: string;
  period: string;
  current: boolean;
}

export interface AboutCareerSeat {
  name: string;
  location: string;
  department?: string;
  period: string;
  titles: AboutCareerTitle[];
}

export interface AboutCareerFact {
  name: string;
  detail: string;
  period: string;
}

export interface AboutCareerCertification {
  name: string;
}

export interface AboutCareerViews {
  current: AboutCareerSeat | null;
  earlier: AboutCareerFact[];
  certifications: AboutCareerCertification[];
}

function chronologicalRoles(roles: Role[]): Role[] {
  return [...roles].reverse();
}

function formatOpenPeriod(period: string): string {
  const match = period.match(/^(.*?)\s*-\s*Present$/i);
  if (!match) {
    return period;
  }
  return `since ${match[1].trim()}`;
}

function spanPeriod(roles: Role[]): string {
  if (roles.length === 0) {
    return '';
  }

  const chrono = chronologicalRoles(roles);
  if (chrono.length === 1) {
    return chrono[0].period;
  }

  const start = chrono[0].period.split(' - ')[0]?.trim() ?? chrono[0].period;
  const latest = chrono[chrono.length - 1].period.split(' - ');
  const end = (latest[1] ?? latest[0])?.trim() ?? chrono[chrono.length - 1].period;
  return `${start} - ${end}`;
}

function titlesFrom(roles: Role[]): AboutCareerTitle[] {
  return roles.map((role, index) => ({
    role: role.role,
    period: formatOpenPeriod(role.period),
    current: index === 0,
  }));
}

function factFromCompany(company: Company): AboutCareerFact {
  const titles = titlesFrom(company.roles);
  return {
    name: company.name,
    detail: titles.map((title) => title.role).join(' → '),
    period: formatOpenPeriod(spanPeriod(company.roles)),
  };
}

export function getAboutCareerViews(profile: CareerProfile): AboutCareerViews {
  const [currentCompany, ...previousCompanies] = profile.experience.companies;
  const current = currentCompany
    ? {
        name: currentCompany.name,
        location: currentCompany.location,
        period: formatOpenPeriod(spanPeriod(currentCompany.roles)),
        titles: titlesFrom(currentCompany.roles),
        ...(currentCompany.department
          ? { department: currentCompany.department }
          : {}),
      }
    : null;

  const earlier: AboutCareerFact[] = [
    ...previousCompanies.map(factFromCompany),
    ...profile.education.entries.map((entry) => ({
      name: entry.institution,
      detail: entry.qualification,
      period: entry.period,
    })),
  ];

  return {
    current,
    earlier,
    certifications: profile.certifications.items.map((item) => ({ name: item.name })),
  };
}
