// Page-specific types
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

export interface Role {
  role: string;
  period: string;
  description: string;
}

export interface Company {
  name: string;
  location: string;
  department?: string;
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
  description?: string;
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

/** Home Role on the Claim — not career `Role`. */
export interface ClaimRole {
  id: string;
  question: string;
}

export type ProofMedia = 'loop' | 'photo';

export interface ProofDoor {
  id: string;
  label: string;
  href: string;
  media: ProofMedia;
  /** Still under `/loops/`. Untreated when `media` is `photo`. */
  src?: string;
}

export interface HomeClaim {
  lockup: string[];
  roles: ClaimRole[];
  landingLine: string;
  loopSrc: string;
  loopObjectPosition?: string;
}

export interface HomeStatement {
  headline: string;
  lines: string[];
  cta: {
    label: string;
    href: string;
  };
  continue: {
    label: string;
    href: string;
  };
  portrait: {
    src: string;
    alt: string;
  };
}

export interface HomeProof {
  doors: ProofDoor[];
}

export interface HomePageData {
  claim: HomeClaim;
  statement: HomeStatement;
  proof: HomeProof;
}

export interface PortfolioPageData {
  heading: string;
  description: string;
  images: PhotoItem[];
}

export interface AboutPageData {
  heading: string;
  lede: string[];
}

export interface BlogPageData {
  heading: string;
  description: string;
  emptyState: string;
  catalogueAriaLabel: string;
}

export interface LabIndexItem {
  title: string;
  /** Short first line under the lab title. */
  lede: string;
  description: string;
  href: string;
  ctaLabel: string;
}

export interface LabsPageData {
  heading: string;
  description: string;
  brandEyebrow: string;
  purposeLine: string;
  catalogueAriaLabel: string;
  labs: LabIndexItem[];
}

export interface JobOsNavItem {
  id: string;
  label: string;
  href: string;
}

export interface WmwPageData {
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
      accountsGroupLabel: string;
      accountsEmptyLabel: string;
      inactiveAccountsGroupLabel: string;
      inactiveAccountsEmptyLabel: string;
      items: Array<{ id: string; label: string; href: string }>;
    };
  };
  overview: {
    heading: string;
    description: string;
    loadingLabel: string;
    errorLabel: string;
    emptyHeading: string;
    emptyDescription: string;
    refreshLabel: string;
    refreshingLabel: string;
    asOfLabel: string;
    asOfUnknownLabel: string;
    refreshErrorLastGoodLabel: string;
    refreshErrorEmptyLabel: string;
    refreshErrorMissingTabLabel: string;
    warningsLabel: string;
    warningsDescription: string;
    netWorthHeading: string;
    netWorthEmptyLabel: string;
    kpiCashSavingsLabel: string;
    kpiGeneralInvestmentsLabel: string;
    kpiRetirementLabel: string;
    historyHeading: string;
    historyEmptyLabel: string;
    historyChartAriaLabel: string;
    classMixHeading: string;
    classMixChartAriaLabel: string;
    classHeading: string;
    accountHeading: string;
    monthSlicerLabel: string;
    accountSearchLabel: string;
    accountSearchPlaceholder: string;
    columnClass: string;
    columnAccount: string;
    columnCategory: string;
    columnContribution: string;
    columnBalance: string;
    columnPct: string;
    columnMom: string;
    basisAriaLabel: string;
    basisNetLabel: string;
    basisGrossLabel: string;
    pairAssetLabel: string;
    pairLiabilityLabel: string;
    pairLessLabel: string;
    negativeEquityLabel: string;
    mwrUnavailableLabel: string;
    periodYtd: string;
    period1y: string;
    periodMax: string;
    mwrReasons: {
      'not-investable': string;
      'account-not-found': string;
      'no-opening-balance': string;
      'no-closing-balance': string;
      'no-usable-cashflows': string;
      'invalid-period': string;
      'irr-failed': string;
    };
  };
  accountDetail: {
    heading: string;
    description: string;
    loadingLabel: string;
    errorLabel: string;
    notFoundHeading: string;
    notFoundDescription: string;
    backToOverviewLabel: string;
    metadataHeading: string;
    columnField: string;
    columnValue: string;
    fieldPlatform: string;
    fieldCategory: string;
    fieldClass: string;
    fieldType: string;
    fieldPair: string;
    pairNoneLabel: string;
    classUnknownLabel: string;
    typeUnknownLabel: string;
    latestBalanceLabel: string;
    balanceEmptyLabel: string;
    seriesHeading: string;
    seriesViewAriaLabel: string;
    seriesViewBalanceLabel: string;
    seriesViewPerformanceLabel: string;
    seriesEmptyLabel: string;
    balanceChartAriaLabel: string;
    performanceChartAriaLabel: string;
    cashflowsHeading: string;
    cashflowsEmptyLabel: string;
    cashflowsCountLabel: string;
    cashflowsNetLabel: string;
    cashflowsContributionsLabel: string;
    cashflowsWithdrawalsLabel: string;
    cashflowsRepaymentsLabel: string;
    cashflowsLastLabel: string;
    unitsHeading: string;
    unitsChartAriaLabel: string;
    mileageHeading: string;
    mileageChartAriaLabel: string;
    pairEquityLabel: string;
    pairEquityHistoryHeading: string;
    pairEquityChartAriaLabel: string;
    legAssetLabel: string;
    legLiabilityLabel: string;
    mwrHeading: string;
    mwrDescription: string;
  };
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
    loadingLabel: string;
    errorLabel: string;
    emptyList: string;
    emptyOpportunitiesCta: string;
    columnEmployer: string;
    columnOpportunity: string;
    columnStatus: string;
    columnTracking: string;
    noTrackingNoteLabel: string;
    untitledOpportunityLabel: string;
    statusOptions: {
      researching: string;
      applied: string;
      interviewing: string;
      offer: string;
    };
    statusHints: {
      researching: string;
    };
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
    columnSector: string;
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
    sectorLabel: string;
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
  };
  lists: {
    heading: string;
    description: string;
    loadingLabel: string;
    errorLabel: string;
    kindTabsAriaLabel: string;
    columnValue: string;
    columnLabel: string;
    columnActive: string;
    columnActions: string;
    valueLabel: string;
    labelLabel: string;
    addLabel: string;
    addingLabel: string;
    saveLabel: string;
    savingLabel: string;
    activateLabel: string;
    deactivateLabel: string;
    emptyList: string;
    createdLabel: string;
    updatedLabel: string;
    inactiveBadge: string;
    kindLabels: Record<string, string>;
  };
  profile: {
    heading: string;
    description: string;
    loadingLabel: string;
    errorLabel: string;
    targetsHeading: string;
    constraintsHeading: string;
    motivationsHeading: string;
    bodyHeading: string;
    targetSeniorityLabel: string;
    targetRoleFamilyLabel: string;
    locationFlexibilityLabel: string;
    compensationFloorLabel: string;
    compensationCurrencyLabel: string;
    compensationPeriodLabel: string;
    mustHaveTagsLabel: string;
    dealBreakerTagsLabel: string;
    escapePainsLabel: string;
    seekDesiresLabel: string;
    bodyLabel: string;
    bodyHint: string;
    saveLabel: string;
    savingLabel: string;
    saveBodyLabel: string;
    savingBodyLabel: string;
    savedLabel: string;
    bodySavedLabel: string;
    noBodyLabel: string;
    emptyHint: string;
    compensationPeriodOptions: Record<string, string>;
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
    focusChecklistHeading: string;
    focusFitInsightHeading: string;
    checklistEmptyProfile: string;
    checklistVerdictPass: string;
    checklistVerdictFail: string;
    checklistVerdictUnknown: string;
    checklistDimensionLabels: Record<string, string>;
    analyseLabel: string;
    reanalyseLabel: string;
    analysingLabel: string;
    analyseBlockedLabel: string;
    fitInsightStaleLabel: string;
    fitInsightEmpty: string;
    fitInsightSummaryHeading: string;
    fitInsightAdvantagesHeading: string;
    fitInsightDisadvantagesHeading: string;
    fitInsightFitNotesHeading: string;
    fitInsightGapsHeading: string;
    analysedLabel: string;
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
    editBodyLabel: string;
    previewBodyLabel: string;
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
    alreadyPassedLabel: string;
    reopenLabel: string;
    reopeningLabel: string;
    reopenedLabel: string;
    pursuedLabel: string;
    noBodyLabel: string;
    statusOptions: Record<string, string>;
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
    columnStatus: string;
    columnRole: string;
    columnEmployer: string;
    columnTracking: string;
    columnBody: string;
    columnActions: string;
    hasBodyLabel: string;
    noBodyShortLabel: string;
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

export interface AdminPageData {
  heading: string;
  description: string;
  postsHeading: string;
  photosHeading: string;
  homePhotoHeading: string;
  signOutLabel: string;
  checkingSessionLabel: string;
  unauthenticatedHeading: string;
  unauthenticatedDescription: string;
  signInLabel: string;
  posts: {
    addLabel: string;
    saveLabel: string;
    deleteLabel: string;
    slugLabel: string;
    titleLabel: string;
    dateLabel: string;
    excerptLabel: string;
    categoryLabel: string;
    tagsLabel: string;
    authorLabel: string;
    markdownLabel: string;
    heroLabel: string;
    emptyLabel: string;
    savedLabel: string;
    deletedLabel: string;
    errorLabel: string;
  };
  photos: {
    addLabel: string;
    saveLabel: string;
    deleteLabel: string;
    titleLabel: string;
    altLabel: string;
    categoryLabel: string;
    locationLabel: string;
    imageLabel: string;
    emptyLabel: string;
    savedLabel: string;
    deletedLabel: string;
    reorderHint: string;
    moveUpLabel: string;
    moveDownLabel: string;
    errorLabel: string;
  };
  homePhoto: {
    description: string;
    titleLabel: string;
    altLabel: string;
    categoryLabel: string;
    locationLabel: string;
    imageLabel: string;
    saveLabel: string;
    clearLabel: string;
    emptyLabel: string;
    savedLabel: string;
    clearedLabel: string;
    errorLabel: string;
  };
}

// Common/shared types
export interface SocialLinks {
  github: string;
  linkedin: string;
}

export interface ContactInfo {
  email: string;
  social: SocialLinks;
  copyright: string;
  admin: NavLink;
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


// Court Board (public Lab; docs/court-board/CONTEXT.md)

export type CourtBoardTierLabels = Record<'employee' | 'alumni' | 'external', string>;

/** Player-facing copy: Session page, signup form, Manage my place. */
export interface CourtBoardPlayerCopy {
  session: {
    placesTaken: string;
    progressLabel: string;
    cancelledNotice: string;
    closedNotice: string;
    startedNotice: string;
    beforeRelease: string;
    afterRelease: string;
    afterCutoff: string;
    topUpNote: string;
    playingHeading: string;
    playingEmpty: string;
    waitlistHeading: string;
    waitlistBandHeading: string;
    guestLabel: string;
    onHold: string;
    manageToggle: string;
    signupClosedNote: string;
  };
  signup: {
    heading: string;
    nameLabel: string;
    phoneLabel: string;
    phoneHelp: string;
    phoneValid: string;
    pinLabel: string;
    pinHelp: string;
    tierLegend: string;
    tierHelp: string;
    guestsHeading: string;
    guestsHelpLimited: string;
    guestsHelpUnlimited: string;
    guestNameLabel: string;
    guestTierLabel: string;
    removeGuest: string;
    addGuest: string;
    submit: string;
    submitting: string;
    successMain: string;
    successWaitlist: string;
    pinSetNote: string;
    manageHint: string;
    another: string;
  };
  manage: {
    heading: string;
    intro: string;
    phoneLabel: string;
    pinLabel: string;
    pinHelp: string;
    open: string;
    opening: string;
    forgotten: string;
    newPinSet: string;
    noPlace: string;
    statusPlaying: string;
    statusWaitlist: string;
    youLabel: string;
    guestLabel: string;
    holdNotice: string;
    edit: string;
    save: string;
    discard: string;
    nameLabel: string;
    saved: string;
    addGuestsHeading: string;
    guestsRemaining: string;
    guestsUnlimited: string;
    guestsFull: string;
    addGuests: string;
    guestsAdded: string;
    cancelPlace: string;
    cancelGuest: string;
    cancelHostNote: string;
    freeBeforeCutoff: string;
    freeGrace: string;
    freeWaitlist: string;
    freeGuest: string;
    penalty: string;
    weekUnit: { one: string; other: string };
    confirmCancel: string;
    confirmCancelPenalty: string;
    keepPlace: string;
    cancelled: string;
    cancelledPenalty: string;
    hide: string;
    closedNote: string;
  };
}

/** Organiser-facing copy: register, Sessions, holds, PIN resets, link. */
export interface CourtBoardOrganiserCopy {
  eyebrow: string;
  invalidHeading: string;
  invalidBody: string;
  tabsAriaLabel: string;
  tabs: { current: string; holds: string; newSession: string };
  sessionPicker: {
    label: string;
    empty: string;
    open: string;
    cancelled: string;
    registerClosed: string;
  };
  current: {
    empty: string;
    createFirst: string;
    /** `{taken}`, `{capacity}`, `{waiting}` */
    status: string;
    cancelledNote: string;
    copyList: string;
    copySignup: string;
    copied: string;
    copyFailed: string;
    /** `{date}` */
    copyNext: string;
    cancelSession: string;
    cancelSessionTitle: string;
    cancelSessionBody: string;
    cancelSessionConfirm: string;
  };
  register: {
    heading: string;
    playingHeading: string;
    waitlistHeading: string;
    empty: string;
    /** `{host}` */
    guestOf: string;
    /** `{digits}` */
    phoneEnding: string;
    /** `{date}` */
    holdUntil: string;
    hereShort: string;
    /** `{name}` */
    hereLabel: string;
    /** `{name}` */
    tierLabel: string;
    remove: string;
    /** `{name}` */
    removeLabel: string;
    /** `{name}` */
    removeTitle: string;
    removeBody: string;
    removeConfirm: string;
    closeRegister: string;
    closeNotStarted: string;
    closedNote: string;
    cancelledNote: string;
    closeTitle: string;
    /** `{attended}`, `{noShows}` */
    closeSummary: string;
    closeNoHolds: string;
    closeHoldsHeading: string;
    /** `{name}`, `{reason}`, `{weeks}`, `{date}` */
    closeHoldLine: string;
    closeConfirm: string;
    /** `{count}` */
    closeDone: string;
  };
  /** Keyed by Penalty reason. */
  reasons: Record<string, string>;
  holds: {
    heading: string;
    empty: string;
    /** `{name}`, `{digits}` */
    player: string;
    weeksOne: string;
    /** `{count}` */
    weeksMany: string;
    /** `{date}` */
    until: string;
    clear: string;
    /** `{name}` */
    clearLabel: string;
    shorten: string;
    /** `{name}` */
    shortenLabel: string;
    shortenDate: string;
    shortenSave: string;
    shortenCancel: string;
    resetHeading: string;
    resetBody: string;
    resetPlayerLabel: string;
    resetPlaceholder: string;
    resetNoPin: string;
    resetButton: string;
    resetNoPlayers: string;
    /** `{name}` */
    resetTitle: string;
    resetConfirm: string;
    /** `{name}` */
    resetDone: string;
  };
  newSession: {
    heading: string;
    intro: string;
    copiedNote: string;
    fields: {
      localDate: string;
      startTime: string;
      endTime: string;
      venue: string;
      capacity: string;
    };
    submit: string;
    submitting: string;
  };
  link: {
    heading: string;
    body: string;
    rotate: string;
    rotateTitle: string;
    rotateBody: string;
    rotateConfirm: string;
    newHeading: string;
    newWarning: string;
    copyNew: string;
    dismiss: string;
  };
  dialog: { cancel: string; working: string };
}

export interface CourtBoardPageData {
  heading: string;
  description: string;
  lab: {
    eyebrow: string;
    lede: string;
    intro: string;
    howItWorksHeading: string;
    howItWorks: string[];
    noLinkNote: string;
    demoHeading: string;
    demoNote: string;
  };
  tiers: CourtBoardTierLabels;
  errors: {
    generic: string;
    /** Keyed by the service's `ErrorCode`; `{minutes}` is replaced where present. */
    byCode: Record<string, string>;
    /** Keyed by the form field named in an `invalid-input` failure. */
    byField: Record<string, string>;
  };
  player: CourtBoardPlayerCopy;
  organiser: CourtBoardOrganiserCopy;
}
