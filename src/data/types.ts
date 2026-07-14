// Page-specific types
export interface HeroSection {
  name: string;
  title: string;
}

export interface AboutSection {
  heading: string;
  content: string | string[];
  cta?: {
    label: string;
    href: string;
  };
}

export interface PhotoItem {
  src: string;
  alt: string;
  title: string;
  category?: string;
  location?: string;
}

export interface PhotographySection {
  heading: string;
  description?: string;
  images: PhotoItem[];
}

export interface Role {
  role: string;
  period: string;
  description: string;
}

export interface Company {
  name: string;
  location: string;
  roles: Role[];
}

export interface ExperienceSection {
  heading: string;
  companies: Company[];
}

export interface CareerProfileExperience {
  companies: Company[];
}

export interface CareerProfileCertifications {
  items: CertificationItem[];
}

export interface EducationEntry {
  institution: string;
  qualification: string;
  period: string;
  description: string;
}

export interface CareerProfileEducation {
  entries: EducationEntry[];
}

export interface EducationSection {
  heading: string;
  entries: EducationEntry[];
}

export interface CareerProfile {
  experience: CareerProfileExperience;
  certifications: CareerProfileCertifications;
  education: CareerProfileEducation;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  issued: string;
  credentialUrl?: string;
}

export interface CertificationsSection {
  heading: string;
  items: CertificationItem[];
}

export interface BlogSection {
  heading: string;
  description?: string;
  cta?: {
    label: string;
    href: string;
  };
  emptyState?: string;
}

export interface HomePageData {
  hero: HeroSection;
  about: AboutSection;
  photography: PhotographySection;
  blog: BlogSection;
}

export interface PortfolioPageData {
  heading: string;
  description: string;
  images: PhotoItem[];
}

export interface AboutPageData {
  hero: HeroSection;
  professional: AboutSection;
}

export interface BlogPageData {
  heading: string;
  description: string;
  emptyState: string;
  filterLabel: string;
  sortLabel: string;
  sortOptions: {
    latest: string;
    oldest: string;
    title: string;
  };
  allCategories: string;
}

export interface LabIndexItem {
  title: string;
  description: string;
  href: string;
}

export interface LabsPageData {
  heading: string;
  description: string;
  labs: LabIndexItem[];
}

export interface JobMarketLabPageData {
  heading: string;
  description: string;
  emptyState: string;
  corpusNote: string;
}

// Common/shared types
export interface SocialLinks {
  github: string;
  linkedin: string;
}

export interface ContactInfo {
  heading: string;
  description: string;
  navigationTitle: string;
  socialTitle: string;
  email: string;
  social: SocialLinks;
  copyright: string;
}

export interface FooterData {
  contact: ContactInfo;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface NavigationData {
  links: NavLink[];
}

export interface SiteMetadata {
  title: string;
  description: string;
  author: string;
  siteUrl: string;
  socialHandle: string;
}

export interface SiteData {
  metadata: SiteMetadata;
  brandName: string;
  locale: string;
  person: {
    jobTitle: string;
    worksFor: string;
    alumniOf: string;
    knowsAbout: string[];
    profileDateCreated: string;
  };
}

export interface BlogPostFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  image: string;
  author: string;
  aiGeneratedContent?: boolean;
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogPostFrontmatter;
  content: string;
}

