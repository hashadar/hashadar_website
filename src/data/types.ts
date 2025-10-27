// Page-specific types
export interface HeroSection {
  name: string;
  title: string;
}

export interface AboutSection {
  heading: string;
  content: string;
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

export interface HomePageData {
  hero: HeroSection;
  about: AboutSection;
  photography: PhotographySection;
  experience: ExperienceSection;
}

export interface PortfolioPageData {
  heading: string;
  description: string;
  images: PhotoItem[];
}

// Common/shared types
export interface SocialLinks {
  github: string;
  linkedin: string;
}

export interface ContactInfo {
  heading: string;
  description: string;
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
}

