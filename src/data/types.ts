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

export interface JobMarketLabAdminCopy {
  heading: string;
  description: string;
  startButtonLabel: string;
  startingLabel: string;
  startedMessage: string;
  rejectedHeading: string;
}

export interface JobMarketLabCorpusAdminData {
  heading: string;
  description: string;
  archiveLabel: string;
  restoreLabel: string;
  statusActiveLabel: string;
  statusArchivedLabel: string;
  emptyList: string;
  loadingLabel: string;
  untitledLabel: string;
  errorLabel: string;
}

export interface JobMarketLabUploadCopy {
  heading: string;
  description: string;
  fileLabel: string;
  uploadButtonLabel: string;
  uploadingLabel: string;
  uploadedMessage: string;
  rejectedHeading: string;
  noFileSelected: string;
}

export interface JobMarketLabCvCopy {
  heading: string;
  description: string;
  loadingLabel: string;
  emptyHint: string;
  seedButtonLabel: string;
  seedingLabel: string;
  seededMessage: string;
  bodyLabel: string;
  saveButtonLabel: string;
  savingLabel: string;
  savedMessage: string;
  errorLabel: string;
}

export interface JobMarketLabHitlQueueCopy {
  heading: string;
  description: string;
  emptyList: string;
  loadingLabel: string;
  errorLabel: string;
  untitledLabel: string;
  acceptLabel: string;
  rejectLabel: string;
  acceptingLabel: string;
  rejectingLabel: string;
  acceptedMessage: string;
  rejectedMessage: string;
  actionErrorHeading: string;
}

export interface JobMarketLabEmployerAdminCopy {
  heading: string;
  description: string;
  nameLabel: string;
  sizeTierLabel: string;
  prestigeTierLabel: string;
  createButtonLabel: string;
  creatingLabel: string;
  saveButtonLabel: string;
  savingLabel: string;
  emptyList: string;
  loadingLabel: string;
  errorLabel: string;
  createdMessage: string;
  savedMessage: string;
  rejectedHeading: string;
}

export interface JobMarketLabMetadataAdminCopy {
  heading: string;
  description: string;
  employerLabel: string;
  noEmployerOption: string;
  seniorityLabel: string;
  roleFamilyLabel: string;
  compensationCurrencyLabel: string;
  compensationMinLabel: string;
  compensationMaxLabel: string;
  compensationPeriodLabel: string;
  unsetOption: string;
  saveButtonLabel: string;
  savingLabel: string;
  savedMessage: string;
  rejectedHeading: string;
  loadingLabel: string;
  errorLabel: string;
  emptyList: string;
}

export interface JobMarketLabConsoleCopy {
  heading: string;
  description: string;
  unauthenticatedHeading: string;
  unauthenticatedDescription: string;
  signInLabel: string;
  openConsoleLabel: string;
  runsHeading: string;
  runsDescription: string;
  runsEmpty: string;
  runsLoading: string;
  runsError: string;
  runStatusQueued: string;
  runStatusRunning: string;
  runStatusSucceeded: string;
  runStatusFailed: string;
  failureReasonLabel: string;
  cv: JobMarketLabCvCopy;
  themeLabelsHeading: string;
  themeLabelsDescription: string;
  themeLabelsEmpty: string;
  themeLabelsLoading: string;
  themeLabelsError: string;
  themeLabelInputLabel: string;
  themeLabelSaveLabel: string;
  themeLabelSavingLabel: string;
  themeLabelSavedMessage: string;
  themeLabelSizeLabel: string;
}

export interface JobMarketLabPayPrestigeAnalyticsCopy {
  heading: string;
  description: string;
  loadingLabel: string;
  errorLabel: string;
  activeDocumentsLabel: string;
  missingDataHeading: string;
  prestigeHeading: string;
  sizeHeading: string;
  compensationHeading: string;
  compensationEmpty: string;
  presentLabel: string;
  missingLabel: string;
  medianMinLabel: string;
  medianMaxLabel: string;
  documentCountLabel: string;
  missingFieldLabels: {
    employerLink: string;
    compensationCurrency: string;
    compensationMin: string;
    compensationMax: string;
    compensationPeriod: string;
    completeCompensation: string;
  };
}

export interface JobMarketLabPageData {
  heading: string;
  description: string;
  emptyState: string;
  corpusNote: string;
  metricsHeading: string;
  documentCountLabel: string;
  publishedAtLabel: string;
  skillsHeading: string;
  taxonomyHeading: string;
  seniorityLabel: string;
  roleFamilyLabel: string;
  clustersHeading: string;
  admin: JobMarketLabAdminCopy;
  corpusAdmin: JobMarketLabCorpusAdminData;
  upload: JobMarketLabUploadCopy;
  hitlQueue: JobMarketLabHitlQueueCopy;
  employerAdmin: JobMarketLabEmployerAdminCopy;
  metadataAdmin: JobMarketLabMetadataAdminCopy;
  payPrestigeAnalytics: JobMarketLabPayPrestigeAnalyticsCopy;
  console: JobMarketLabConsoleCopy;
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

