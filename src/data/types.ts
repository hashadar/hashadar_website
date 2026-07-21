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

export interface JobMarketLabAdminCopy {
  heading: string;
  description: string;
  startButtonLabel: string;
  startingLabel: string;
  startedMessage: string;
  startedMessageWithRunsHint: string;
  secondaryStartDescription: string;
  rejectedHeading: string;
}

export interface JobMarketLabAnalyticsWorkspaceCopy {
  heading: string;
  description: string;
  summaryHeading: string;
  activeDocumentsLabel: string;
  payDisclosedLabel: string;
  payUndisclosedLabel: string;
  employerLinkedLabel: string;
  completeCompensationLabel: string;
  startRecomputeHeading: string;
  startRecomputeDescription: string;
  viewRunsLabel: string;
  secondaryToolsHeading: string;
  secondaryToolsDescription: string;
}

export interface JobMarketLabFitWorkspaceCopy {
  heading: string;
  description: string;
  loadingLabel: string;
  errorLabel: string;
  saveCvFirstHint: string;
  modeRoleLabel: string;
  modeMarketLabel: string;
  jdSearchLabel: string;
  jdSearchPlaceholder: string;
  cvColumnHeading: string;
  resultsHeading: string;
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
  uploadedManyMessage: string;
  partialUploadMessage: string;
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

export interface JobMarketLabCompareCopy {
  heading: string;
  description: string;
  selectLabel: string;
  noSelectionOption: string;
  runButtonLabel: string;
  runningLabel: string;
  loadingJdsLabel: string;
  errorLabel: string;
  noCvError: string;
  noJdSelectedError: string;
  missingMarkdownError: string;
  matchesHeading: string;
  gapsHeading: string;
  talkingPointsHeading: string;
  learningTargetsHeading: string;
  matchesEmpty: string;
  gapsEmpty: string;
  talkingPointsEmpty: string;
  learningTargetsEmpty: string;
  matchTalkingPointTemplate: string;
  gapTalkingPointTemplate: string;
  gapLearningTargetTemplate: string;
}

export interface JobMarketLabMarketCompareCopy {
  heading: string;
  description: string;
  runButtonLabel: string;
  runningLabel: string;
  loadingPulseLabel: string;
  errorLabel: string;
  noCvError: string;
  noPulseError: string;
  matchesHeading: string;
  gapsHeading: string;
  talkingPointsHeading: string;
  learningTargetsHeading: string;
  matchesEmpty: string;
  gapsEmpty: string;
  talkingPointsEmpty: string;
  learningTargetsEmpty: string;
  matchTalkingPointTemplate: string;
  gapTalkingPointTemplate: string;
  gapLearningTargetTemplate: string;
}

export interface JobMarketLabHitlParseListingCopy {
  heading: string;
  description: string;
  urlLabel: string;
  urlPlaceholder: string;
  submitLabel: string;
  fetchingLabel: string;
  extractingLabel: string;
  successHeading: string;
  successMessage: string;
  previewLabel: string;
  costLabel: string;
  unfetchableHeading: string;
  extractFailedHeading: string;
  rejectedHeading: string;
  pasteFallbackHeading: string;
  pasteFallbackDescription: string;
  pasteLabel: string;
  pastePlaceholder: string;
  pasteSubmitLabel: string;
  showPasteLabel: string;
  hidePasteLabel: string;
}

export interface JobMarketLabHitlQueueCopy {
  heading: string;
  description: string;
  emptyList: string;
  pendingHeading: string;
  pendingCountLabel: string;
  loadingLabel: string;
  errorLabel: string;
  untitledLabel: string;
  controlsHeading: string;
  reviewHeading: string;
  emptyReview: string;
  selectPendingHint: string;
  bodyPreviewLabel: string;
  acceptLabel: string;
  rejectLabel: string;
  acceptingLabel: string;
  rejectingLabel: string;
  acceptedMessage: string;
  rejectedMessage: string;
  actionErrorHeading: string;
  titleLabel: string;
  sourceLabel: string;
  collectedAtLabel: string;
  employerLabel: string;
  noEmployerOption: string;
  employersLoadingLabel: string;
  employersErrorLabel: string;
  employerUnsetWarning: string;
  employerUnknownWarning: string;
  parseListing: JobMarketLabHitlParseListingCopy;
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

export interface JobMarketLabCompensationDisclosureOptions {
  range: string;
  competitive: string;
  unknown: string;
}

export interface JobMarketLabMetadataAdminCopy {
  heading: string;
  description: string;
  employerLabel: string;
  noEmployerOption: string;
  seniorityLabel: string;
  roleFamilyLabel: string;
  compensationDisclosureLabel: string;
  compensationDisclosureOptions: JobMarketLabCompensationDisclosureOptions;
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

export interface JobMarketPulseFilterTimeOptions {
  all: string;
  '3m': string;
  '6m': string;
  '12m': string;
  '18m': string;
}

export interface JobMarketLabConsoleNavItem {
  id: string;
  href: string;
  label: string;
  description: string;
}

export interface JobMarketLabConsoleNavCopy {
  ariaLabel: string;
  mobileLabel: string;
  items: JobMarketLabConsoleNavItem[];
}

export interface JobMarketLabConsoleOverviewCopy {
  heading: string;
  description: string;
  areasHeading: string;
  statusHeading: string;
  lastRunLabel: string;
  lastRunEmpty: string;
  pendingHitlLabel: string;
  pendingHitlCount: string;
  pendingHitlEmpty: string;
  loadingLabel: string;
  errorLabel: string;
  openAreaLabel: string;
}

export interface JobMarketLabConsoleCopy {
  heading: string;
  description: string;
  unauthenticatedHeading: string;
  unauthenticatedDescription: string;
  signInLabel: string;
  openConsoleLabel: string;
  nav: JobMarketLabConsoleNavCopy;
  overview: JobMarketLabConsoleOverviewCopy;
  runsHeading: string;
  runsDescription: string;
  runsEmpty: string;
  runsLoading: string;
  runsError: string;
  runsDocsConsideredLabel: string;
  runsEstimatedCostLabel: string;
  runsReloadLabel: string;
  runStatusQueued: string;
  runStatusRunning: string;
  runStatusSucceeded: string;
  runStatusFailed: string;
  failureReasonLabel: string;
  analyticsWorkspace: JobMarketLabAnalyticsWorkspaceCopy;
  fitWorkspace: JobMarketLabFitWorkspaceCopy;
  cv: JobMarketLabCvCopy;
  compare: JobMarketLabCompareCopy;
  marketCompare: JobMarketLabMarketCompareCopy;
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
  pulseFiltersHeading: string;
  pulseFiltersDescription: string;
  pulseFiltersLoading: string;
  pulseFiltersEmpty: string;
  pulseFiltersError: string;
  pulseFiltersTimeLabel: string;
  pulseFiltersAllOption: string;
  pulseFiltersDocumentCountLabel: string;
  pulseFiltersTechnologiesLabel: string;
  pulseFiltersThemesLabel: string;
  pulseFilterTimeOptions: JobMarketPulseFilterTimeOptions;
  corpusWorkspace: JobMarketLabCorpusWorkspaceCopy;
}

export interface JobMarketLabCorpusWorkspaceCopy {
  heading: string;
  description: string;
  loadingLabel: string;
  errorLabel: string;
  emptyLabel: string;
  filteredEmptyLabel: string;
  documentCountLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  statusFilterLabel: string;
  statusFilterAll: string;
  statusFilterActive: string;
  statusFilterArchived: string;
  missingEmployerFilterLabel: string;
  missingPayFilterLabel: string;
  columnTitle: string;
  columnStatus: string;
  columnSeniority: string;
  columnRoleFamily: string;
  columnEmployer: string;
  columnCompensation: string;
  columnCollectedAt: string;
  columnGaps: string;
  columnActions: string;
  statusActive: string;
  statusArchived: string;
  noEmployerOption: string;
  unsetOption: string;
  gapEmployer: string;
  gapPay: string;
  gapNone: string;
  saveRowLabel: string;
  savingRowLabel: string;
  rowSavedMessage: string;
  rowSaveError: string;
  archiveLabel: string;
  restoreLabel: string;
  archivingLabel: string;
  restoringLabel: string;
  openDetailLabel: string;
  closeDetailLabel: string;
  detailHeading: string;
  markdownLabel: string;
  markdownLoading: string;
  markdownError: string;
  markdownMissingKey: string;
  saveMarkdownLabel: string;
  savingMarkdownLabel: string;
  markdownSavedMessage: string;
  markdownSaveError: string;
  metadataHeading: string;
  employerLabel: string;
  employerUnsetWarning: string;
  employerUnknownWarning: string;
  frontmatterMergedNotice: string;
  seniorityLabel: string;
  roleFamilyLabel: string;
  compensationDisclosureLabel: string;
  compensationDisclosureOptions: JobMarketLabCompensationDisclosureOptions;
  compensationCurrencyLabel: string;
  compensationMinLabel: string;
  compensationMaxLabel: string;
  compensationPeriodLabel: string;
  sourceLabel: string;
  saveMetadataLabel: string;
  savingMetadataLabel: string;
  metadataSavedMessage: string;
  metadataSaveError: string;
  registryHeading: string;
  registryDescription: string;
  registryExpandLabel: string;
  registryCollapseLabel: string;
  auditHeading: string;
  auditDescription: string;
  auditLoadingLabel: string;
  auditErrorLabel: string;
  auditJobDescriptionsLabel: string;
  auditActiveLabel: string;
  auditArchivedLabel: string;
  auditMissingEmployerLabel: string;
  auditMissingPayLabel: string;
  auditEmployersLabel: string;
  auditPendingIntakeLabel: string;
  auditRunsLabel: string;
  auditFailedRunsLabel: string;
  employersButtonLabel: string;
  employersModalHeading: string;
  employersModalDescription: string;
  employersModalCloseLabel: string;
  employersNameLabel: string;
  employersSizeLabel: string;
  employersPrestigeLabel: string;
  employersCreateLabel: string;
  employersCreatingLabel: string;
  employersSaveLabel: string;
  employersSavingLabel: string;
  employersEmpty: string;
  employersCreatedMessage: string;
  employersSavedMessage: string;
  employersError: string;
}

export interface JobMarketLabPayPrestigeAnalyticsCopy {
  heading: string;
  description: string;
  loadingLabel: string;
  errorLabel: string;
  activeDocumentsLabel: string;
  missingDataHeading: string;
  disclosureHeading: string;
  prestigeHeading: string;
  sizeHeading: string;
  compensationHeading: string;
  compensationEmpty: string;
  presentLabel: string;
  missingLabel: string;
  medianMinLabel: string;
  medianMaxLabel: string;
  documentCountLabel: string;
  disclosureLabels: JobMarketLabCompensationDisclosureOptions;
  missingFieldLabels: {
    employerLink: string;
    compensationCurrency: string;
    compensationMin: string;
    compensationMax: string;
    compensationPeriod: string;
    compensationDisclosed: string;
    completeCompensation: string;
  };
}

export interface JobMarketLabCraftStage {
  id: string;
  title: string;
  inShort: string;
  underTheHood: string;
}

export interface JobMarketLabCraftCopy {
  heading: string;
  intro: string;
  inShortLabel: string;
  underTheHoodLabel: string;
  /** Optional closing note under the craft stages; omit on the public page when unused. */
  closing?: string;
  stages: JobMarketLabCraftStage[];
}

export interface JobMarketLabPageData {
  /** Possessive brand line shown above the heading (e.g. "Hasha Dar's"). */
  brandEyebrow: string;
  heading: string;
  purposeLine: string;
  description: string;
  emptyState: string;
  /** Optional privacy note under the hero; omit when not shown on the public page. */
  corpusNote?: string;
  craft: JobMarketLabCraftCopy;
  metricsHeading: string;
  documentCountLabel: string;
  publishedAtLabel: string;
  topSignalsLabel: string;
  skillsHeading: string;
  skillsCaption: string;
  taxonomyHeading: string;
  seniorityLabel: string;
  roleFamilyLabel: string;
  clustersHeading: string;
  clustersSizeHeading: string;
  clustersMapHeading: string;
  clustersCaption: string;
  pulseFiltersTimeLabel: string;
  pulseFilterTimeOptions: JobMarketPulseFilterTimeOptions;
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

