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
  brandEyebrow: string;
  purposeLine: string;
  ctaLabel: string;
  flagshipTitle: string;
  teaserAriaLabel: string;
  labs: LabIndexItem[];
}

export interface JobOsNavItem {
  id: string;
  label: string;
  href: string;
}

export interface JobOsPageData {
  heading: string;
  description: string;
  unauthenticatedHeading: string;
  unauthenticatedDescription: string;
  signInLabel: string;
  checkingSessionLabel: string;
  shell: {
    heading: string;
    description: string;
    nav: {
      ariaLabel: string;
      mobileLabel: string;
      items: JobOsNavItem[];
    };
  };
  overview: {
    heading: string;
    description: string;
    employersCta: string;
    opportunitiesCta: string;
    applicationsCta: string;
  };
  employers: Record<string, unknown> & {
    heading: string;
    description: string;
    loadingLabel: string;
    emptyList: string;
    errorLabel: string;
    createHeading: string;
    editHeading: string;
    addLabel: string;
    dismissCaptureLabel: string;
    moreFieldsLabel: string;
    columnName: string;
    columnSize: string;
    columnPrestige: string;
    columnOpen: string;
    columnBody: string;
    columnActions: string;
    focusIdentityHeading: string;
    focusPresenceHeading: string;
    focusBodyHeading: string;
    hasBodyLabel: string;
    noBodyShortLabel: string;
    nameLabel: string;
    sizeTierLabel: string;
    prestigeTierLabel: string;
    summaryLabel: string;
    websiteUrlLabel: string;
    linkedinUrlLabel: string;
    notesLabel: string;
    bodyLabel: string;
    bodyHint: string;
    saveLabel: string;
    savingLabel: string;
    createLabel: string;
    creatingLabel: string;
    ensureAnonLabel: string;
    ensuringAnonLabel: string;
    openLabel: string;
    backLabel: string;
    anonBadge: string;
    bodySavedLabel: string;
    savedLabel: string;
    createdLabel: string;
    anonReadyLabel: string;
    noBodyLabel: string;
    sizeTierOptions: Record<string, string>;
    prestigeTierOptions: Record<string, string>;
  };
  opportunities: Record<string, unknown> & {
    heading: string;
    description: string;
    loadingLabel: string;
    emptyList: string;
    errorLabel: string;
    createHeading: string;
    editHeading: string;
    addLabel: string;
    dismissCaptureLabel: string;
    moreFieldsLabel: string;
    columnStatus: string;
    columnTitle: string;
    columnEmployer: string;
    columnNoticed: string;
    columnSignal: string;
    columnPursuit: string;
    columnActions: string;
    focusListingHeading: string;
    focusEvidenceHeading: string;
    focusBodyHeading: string;
    passShortLabel: string;
    pursueShortLabel: string;
    openApplicationLabel: string;
    pursuitPassedLabel: string;
    employerLabel: string;
    titleLabel: string;
    sourceLabel: string;
    noticedAtLabel: string;
    statusLabel: string;
    seniorityLabel: string;
    roleFamilyLabel: string;
    compensationDisclosureLabel: string;
    compensationCurrencyLabel: string;
    compensationMinLabel: string;
    compensationMaxLabel: string;
    compensationPeriodLabel: string;
    technologiesLabel: string;
    bodyLabel: string;
    bodyHint: string;
    saveLabel: string;
    savingLabel: string;
    createLabel: string;
    creatingLabel: string;
    openLabel: string;
    backLabel: string;
    passLabel: string;
    passingLabel: string;
    pursueLabel: string;
    pursuingLabel: string;
    timelineHeading: string;
    timelineEmpty: string;
    untitledLabel: string;
    savedLabel: string;
    createdLabel: string;
    passedLabel: string;
    pursuedLabel: string;
    noBodyLabel: string;
    statusOptions: Record<string, string>;
    seniorityOptions: Record<string, string>;
    roleFamilyOptions: Record<string, string>;
    compensationDisclosureOptions: Record<string, string>;
    compensationPeriodOptions: Record<string, string>;
    eventKindLabels: Record<string, string>;
  };
  applications: Record<string, unknown> & {
    heading: string;
    description: string;
    loadingLabel: string;
    emptyList: string;
    errorLabel: string;
    openLabel: string;
    backLabel: string;
    statusLabel: string;
    trackingNoteLabel: string;
    trackingNoteHint: string;
    bodyLabel: string;
    bodyHint: string;
    saveStatusLabel: string;
    savingStatusLabel: string;
    saveNoteLabel: string;
    savingNoteLabel: string;
    saveBodyLabel: string;
    savingBodyLabel: string;
    timelineHeading: string;
    timelineEmpty: string;
    untitledOpportunityLabel: string;
    statusUpdatedLabel: string;
    noteSavedLabel: string;
    bodySavedLabel: string;
    noBodyLabel: string;
    statusOptions: Record<string, string>;
  };
}

export interface LoginPageErrors {
  generic: string;
  notConfigured: string;
  required: string;
}

export interface LoginPageData {
  heading: string;
  description: string;
  emailLabel: string;
  passwordLabel: string;
  submitLabel: string;
  signOutLabel: string;
  signedInHeading: string;
  signedInDescription: string;
  errors: LoginPageErrors;
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
  ownerSignIn: NavLink;
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

