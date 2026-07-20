type AssertFn = (data: unknown) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(message);
}

function requireString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${context}: expected non-empty string "${key}"`);
  }
  return value;
}

function requireRecord(value: unknown, context: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${context}: expected an object`);
  }
  return value;
}

function requireArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(`${context}: expected an array`);
  }
  return value;
}

function assertCta(value: unknown, context: string): void {
  const cta = requireRecord(value, context);
  requireString(cta, 'label', context);
  requireString(cta, 'href', context);
}

function assertAboutSection(value: unknown, context: string): void {
  const section = requireRecord(value, context);
  requireString(section, 'heading', context);
  const content = section.content;
  const contentOk =
    typeof content === 'string' ||
    (Array.isArray(content) && content.every((item) => typeof item === 'string'));
  if (!contentOk) {
    fail(`${context}: content must be a string or string array`);
  }
  if (section.cta !== undefined) {
    assertCta(section.cta, `${context}.cta`);
  }
}

function assertPhotoItem(value: unknown, context: string): void {
  const item = requireRecord(value, context);
  requireString(item, 'src', context);
  requireString(item, 'alt', context);
  requireString(item, 'title', context);
}

export function validateDataFile(
  file: string,
  data: unknown,
  assertShape: AssertFn,
): void {
  try {
    assertShape(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid data in ${file}: ${message}`);
  }
}

export function assertValidHomePage(data: unknown): void {
  const page = requireRecord(data, 'home');
  const hero = requireRecord(page.hero, 'home.hero');
  requireString(hero, 'name', 'home.hero');
  requireString(hero, 'title', 'home.hero');
  assertAboutSection(page.about, 'home.about');
  const photography = requireRecord(page.photography, 'home.photography');
  requireString(photography, 'heading', 'home.photography');
  requireArray(photography.images, 'home.photography.images').forEach((image, index) =>
    assertPhotoItem(image, `home.photography.images[${index}]`),
  );
  const blog = requireRecord(page.blog, 'home.blog');
  requireString(blog, 'heading', 'home.blog');
}

export function assertValidAboutPage(data: unknown): void {
  const page = requireRecord(data, 'about');
  const hero = requireRecord(page.hero, 'about.hero');
  requireString(hero, 'name', 'about.hero');
  requireString(hero, 'title', 'about.hero');
  assertAboutSection(page.professional, 'about.professional');
}

export function assertValidBlogPage(data: unknown): void {
  const page = requireRecord(data, 'blog');
  requireString(page, 'heading', 'blog');
  requireString(page, 'description', 'blog');
  requireString(page, 'emptyState', 'blog');
  requireString(page, 'filterLabel', 'blog');
  requireString(page, 'sortLabel', 'blog');
  requireString(page, 'allCategories', 'blog');
  const sortOptions = requireRecord(page.sortOptions, 'blog.sortOptions');
  requireString(sortOptions, 'latest', 'blog.sortOptions');
  requireString(sortOptions, 'oldest', 'blog.sortOptions');
  requireString(sortOptions, 'title', 'blog.sortOptions');
}

export function assertValidPortfolioPage(data: unknown): void {
  const page = requireRecord(data, 'portfolio');
  requireString(page, 'heading', 'portfolio');
  requireString(page, 'description', 'portfolio');
  requireArray(page.images, 'portfolio.images').forEach((image, index) =>
    assertPhotoItem(image, `portfolio.images[${index}]`),
  );
}

export function assertValidLabsPage(data: unknown): void {
  const page = requireRecord(data, 'labs');
  requireString(page, 'heading', 'labs');
  requireString(page, 'description', 'labs');
  requireString(page, 'brandEyebrow', 'labs');
  requireString(page, 'purposeLine', 'labs');
  requireString(page, 'ctaLabel', 'labs');
  requireString(page, 'flagshipTitle', 'labs');
  requireString(page, 'teaserAriaLabel', 'labs');
  requireArray(page.labs, 'labs.labs').forEach((lab, index) => {
    const item = requireRecord(lab, `labs.labs[${index}]`);
    requireString(item, 'title', `labs.labs[${index}]`);
    requireString(item, 'description', `labs.labs[${index}]`);
    requireString(item, 'href', `labs.labs[${index}]`);
  });
}

export function assertValidJobMarketLabPage(data: unknown): void {
  const page = requireRecord(data, 'jobMarketLab');
  requireString(page, 'brandEyebrow', 'jobMarketLab');
  requireString(page, 'heading', 'jobMarketLab');
  requireString(page, 'purposeLine', 'jobMarketLab');
  requireString(page, 'description', 'jobMarketLab');
  requireString(page, 'emptyState', 'jobMarketLab');
  if (page.corpusNote !== undefined) {
    requireString(page, 'corpusNote', 'jobMarketLab');
  }
  const craft = requireRecord(page.craft, 'jobMarketLab.craft');
  requireString(craft, 'heading', 'jobMarketLab.craft');
  requireString(craft, 'intro', 'jobMarketLab.craft');
  requireString(craft, 'inShortLabel', 'jobMarketLab.craft');
  requireString(craft, 'underTheHoodLabel', 'jobMarketLab.craft');
  if (craft.closing !== undefined) {
    requireString(craft, 'closing', 'jobMarketLab.craft');
  }
  const craftStages = requireArray(craft.stages, 'jobMarketLab.craft.stages');
  if (craftStages.length === 0) {
    fail('jobMarketLab.craft.stages: expected at least one stage');
  }
  for (const [index, stageValue] of craftStages.entries()) {
    const stage = requireRecord(stageValue, `jobMarketLab.craft.stages[${index}]`);
    requireString(stage, 'id', `jobMarketLab.craft.stages[${index}]`);
    requireString(stage, 'title', `jobMarketLab.craft.stages[${index}]`);
    requireString(stage, 'inShort', `jobMarketLab.craft.stages[${index}]`);
    requireString(stage, 'underTheHood', `jobMarketLab.craft.stages[${index}]`);
  }
  requireString(page, 'metricsHeading', 'jobMarketLab');
  requireString(page, 'documentCountLabel', 'jobMarketLab');
  requireString(page, 'publishedAtLabel', 'jobMarketLab');
  requireString(page, 'topSignalsLabel', 'jobMarketLab');
  requireString(page, 'skillsHeading', 'jobMarketLab');
  requireString(page, 'skillsCaption', 'jobMarketLab');
  requireString(page, 'taxonomyHeading', 'jobMarketLab');
  requireString(page, 'seniorityLabel', 'jobMarketLab');
  requireString(page, 'roleFamilyLabel', 'jobMarketLab');
  requireString(page, 'clustersHeading', 'jobMarketLab');
  requireString(page, 'clustersSizeHeading', 'jobMarketLab');
  requireString(page, 'clustersMapHeading', 'jobMarketLab');
  requireString(page, 'clustersCaption', 'jobMarketLab');
  requireString(page, 'pulseFiltersTimeLabel', 'jobMarketLab');
  const pulseFilterTimeOptions = requireRecord(
    page.pulseFilterTimeOptions,
    'jobMarketLab.pulseFilterTimeOptions',
  );
  requireString(pulseFilterTimeOptions, 'all', 'jobMarketLab.pulseFilterTimeOptions');
  requireString(pulseFilterTimeOptions, '3m', 'jobMarketLab.pulseFilterTimeOptions');
  requireString(pulseFilterTimeOptions, '6m', 'jobMarketLab.pulseFilterTimeOptions');
  requireString(pulseFilterTimeOptions, '12m', 'jobMarketLab.pulseFilterTimeOptions');
  requireString(pulseFilterTimeOptions, '18m', 'jobMarketLab.pulseFilterTimeOptions');
  const admin = requireRecord(page.admin, 'jobMarketLab.admin');
  requireString(admin, 'heading', 'jobMarketLab.admin');
  requireString(admin, 'description', 'jobMarketLab.admin');
  requireString(admin, 'startButtonLabel', 'jobMarketLab.admin');
  requireString(admin, 'startingLabel', 'jobMarketLab.admin');
  requireString(admin, 'startedMessage', 'jobMarketLab.admin');
  requireString(admin, 'startedMessageWithRunsHint', 'jobMarketLab.admin');
  requireString(admin, 'secondaryStartDescription', 'jobMarketLab.admin');
  requireString(admin, 'rejectedHeading', 'jobMarketLab.admin');
  const corpusAdmin = requireRecord(page.corpusAdmin, 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'heading', 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'description', 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'archiveLabel', 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'restoreLabel', 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'statusActiveLabel', 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'statusArchivedLabel', 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'emptyList', 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'loadingLabel', 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'untitledLabel', 'jobMarketLab.corpusAdmin');
  requireString(corpusAdmin, 'errorLabel', 'jobMarketLab.corpusAdmin');
  const upload = requireRecord(page.upload, 'jobMarketLab.upload');
  requireString(upload, 'heading', 'jobMarketLab.upload');
  requireString(upload, 'description', 'jobMarketLab.upload');
  requireString(upload, 'fileLabel', 'jobMarketLab.upload');
  requireString(upload, 'uploadButtonLabel', 'jobMarketLab.upload');
  requireString(upload, 'uploadingLabel', 'jobMarketLab.upload');
  requireString(upload, 'uploadedMessage', 'jobMarketLab.upload');
  requireString(upload, 'rejectedHeading', 'jobMarketLab.upload');
  requireString(upload, 'noFileSelected', 'jobMarketLab.upload');
  const hitlQueue = requireRecord(page.hitlQueue, 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'heading', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'description', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'emptyList', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'pendingHeading', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'pendingCountLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'loadingLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'errorLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'untitledLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'controlsHeading', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'reviewHeading', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'emptyReview', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'selectPendingHint', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'bodyPreviewLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'acceptLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'rejectLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'acceptingLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'rejectingLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'acceptedMessage', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'rejectedMessage', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'actionErrorHeading', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'titleLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'sourceLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'collectedAtLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'employerLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'noEmployerOption', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'employersLoadingLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'employersErrorLabel', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'employerUnsetWarning', 'jobMarketLab.hitlQueue');
  requireString(hitlQueue, 'employerUnknownWarning', 'jobMarketLab.hitlQueue');
  const parseListing = requireRecord(
    hitlQueue.parseListing,
    'jobMarketLab.hitlQueue.parseListing',
  );
  requireString(parseListing, 'heading', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'description', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'urlLabel', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'urlPlaceholder', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'submitLabel', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'fetchingLabel', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'extractingLabel', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'successHeading', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'successMessage', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'previewLabel', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'costLabel', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'unfetchableHeading', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'extractFailedHeading', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'rejectedHeading', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'pasteFallbackHeading', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'pasteFallbackDescription', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'pasteLabel', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'pastePlaceholder', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'pasteSubmitLabel', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'showPasteLabel', 'jobMarketLab.hitlQueue.parseListing');
  requireString(parseListing, 'hidePasteLabel', 'jobMarketLab.hitlQueue.parseListing');
  const employerAdmin = requireRecord(page.employerAdmin, 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'heading', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'description', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'nameLabel', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'sizeTierLabel', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'prestigeTierLabel', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'createButtonLabel', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'creatingLabel', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'saveButtonLabel', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'savingLabel', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'emptyList', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'loadingLabel', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'errorLabel', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'createdMessage', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'savedMessage', 'jobMarketLab.employerAdmin');
  requireString(employerAdmin, 'rejectedHeading', 'jobMarketLab.employerAdmin');
  const metadataAdmin = requireRecord(page.metadataAdmin, 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'heading', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'description', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'employerLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'noEmployerOption', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'seniorityLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'roleFamilyLabel', 'jobMarketLab.metadataAdmin');
  requireString(
    metadataAdmin,
    'compensationDisclosureLabel',
    'jobMarketLab.metadataAdmin',
  );
  const metadataDisclosureOptions = requireRecord(
    metadataAdmin.compensationDisclosureOptions,
    'jobMarketLab.metadataAdmin.compensationDisclosureOptions',
  );
  requireString(
    metadataDisclosureOptions,
    'range',
    'jobMarketLab.metadataAdmin.compensationDisclosureOptions',
  );
  requireString(
    metadataDisclosureOptions,
    'competitive',
    'jobMarketLab.metadataAdmin.compensationDisclosureOptions',
  );
  requireString(
    metadataDisclosureOptions,
    'unknown',
    'jobMarketLab.metadataAdmin.compensationDisclosureOptions',
  );
  requireString(metadataAdmin, 'compensationCurrencyLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'compensationMinLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'compensationMaxLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'compensationPeriodLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'unsetOption', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'saveButtonLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'savingLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'savedMessage', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'rejectedHeading', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'loadingLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'errorLabel', 'jobMarketLab.metadataAdmin');
  requireString(metadataAdmin, 'emptyList', 'jobMarketLab.metadataAdmin');
  const payPrestigeAnalytics = requireRecord(
    page.payPrestigeAnalytics,
    'jobMarketLab.payPrestigeAnalytics',
  );
  requireString(payPrestigeAnalytics, 'heading', 'jobMarketLab.payPrestigeAnalytics');
  requireString(payPrestigeAnalytics, 'description', 'jobMarketLab.payPrestigeAnalytics');
  requireString(payPrestigeAnalytics, 'loadingLabel', 'jobMarketLab.payPrestigeAnalytics');
  requireString(payPrestigeAnalytics, 'errorLabel', 'jobMarketLab.payPrestigeAnalytics');
  requireString(
    payPrestigeAnalytics,
    'activeDocumentsLabel',
    'jobMarketLab.payPrestigeAnalytics',
  );
  requireString(
    payPrestigeAnalytics,
    'missingDataHeading',
    'jobMarketLab.payPrestigeAnalytics',
  );
  requireString(
    payPrestigeAnalytics,
    'disclosureHeading',
    'jobMarketLab.payPrestigeAnalytics',
  );
  requireString(payPrestigeAnalytics, 'prestigeHeading', 'jobMarketLab.payPrestigeAnalytics');
  requireString(payPrestigeAnalytics, 'sizeHeading', 'jobMarketLab.payPrestigeAnalytics');
  requireString(
    payPrestigeAnalytics,
    'compensationHeading',
    'jobMarketLab.payPrestigeAnalytics',
  );
  requireString(payPrestigeAnalytics, 'compensationEmpty', 'jobMarketLab.payPrestigeAnalytics');
  requireString(payPrestigeAnalytics, 'presentLabel', 'jobMarketLab.payPrestigeAnalytics');
  requireString(payPrestigeAnalytics, 'missingLabel', 'jobMarketLab.payPrestigeAnalytics');
  requireString(payPrestigeAnalytics, 'medianMinLabel', 'jobMarketLab.payPrestigeAnalytics');
  requireString(payPrestigeAnalytics, 'medianMaxLabel', 'jobMarketLab.payPrestigeAnalytics');
  requireString(
    payPrestigeAnalytics,
    'documentCountLabel',
    'jobMarketLab.payPrestigeAnalytics',
  );
  const disclosureLabels = requireRecord(
    payPrestigeAnalytics.disclosureLabels,
    'jobMarketLab.payPrestigeAnalytics.disclosureLabels',
  );
  requireString(
    disclosureLabels,
    'range',
    'jobMarketLab.payPrestigeAnalytics.disclosureLabels',
  );
  requireString(
    disclosureLabels,
    'competitive',
    'jobMarketLab.payPrestigeAnalytics.disclosureLabels',
  );
  requireString(
    disclosureLabels,
    'unknown',
    'jobMarketLab.payPrestigeAnalytics.disclosureLabels',
  );
  const missingFieldLabels = requireRecord(
    payPrestigeAnalytics.missingFieldLabels,
    'jobMarketLab.payPrestigeAnalytics.missingFieldLabels',
  );
  requireString(
    missingFieldLabels,
    'employerLink',
    'jobMarketLab.payPrestigeAnalytics.missingFieldLabels',
  );
  requireString(
    missingFieldLabels,
    'compensationCurrency',
    'jobMarketLab.payPrestigeAnalytics.missingFieldLabels',
  );
  requireString(
    missingFieldLabels,
    'compensationMin',
    'jobMarketLab.payPrestigeAnalytics.missingFieldLabels',
  );
  requireString(
    missingFieldLabels,
    'compensationMax',
    'jobMarketLab.payPrestigeAnalytics.missingFieldLabels',
  );
  requireString(
    missingFieldLabels,
    'compensationPeriod',
    'jobMarketLab.payPrestigeAnalytics.missingFieldLabels',
  );
  requireString(
    missingFieldLabels,
    'compensationDisclosed',
    'jobMarketLab.payPrestigeAnalytics.missingFieldLabels',
  );
  requireString(
    missingFieldLabels,
    'completeCompensation',
    'jobMarketLab.payPrestigeAnalytics.missingFieldLabels',
  );
  const consoleCopy = requireRecord(page.console, 'jobMarketLab.console');
  requireString(consoleCopy, 'heading', 'jobMarketLab.console');
  requireString(consoleCopy, 'description', 'jobMarketLab.console');
  requireString(consoleCopy, 'unauthenticatedHeading', 'jobMarketLab.console');
  requireString(consoleCopy, 'unauthenticatedDescription', 'jobMarketLab.console');
  requireString(consoleCopy, 'signInLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'openConsoleLabel', 'jobMarketLab.console');
  const consoleNav = requireRecord(consoleCopy.nav, 'jobMarketLab.console.nav');
  requireString(consoleNav, 'ariaLabel', 'jobMarketLab.console.nav');
  requireString(consoleNav, 'mobileLabel', 'jobMarketLab.console.nav');
  if (!Array.isArray(consoleNav.items) || consoleNav.items.length === 0) {
    throw new Error('jobMarketLab.console.nav.items must be a non-empty array');
  }
  for (const [index, item] of consoleNav.items.entries()) {
    const navItem = requireRecord(item, `jobMarketLab.console.nav.items[${index}]`);
    requireString(navItem, 'id', `jobMarketLab.console.nav.items[${index}]`);
    requireString(navItem, 'href', `jobMarketLab.console.nav.items[${index}]`);
    requireString(navItem, 'label', `jobMarketLab.console.nav.items[${index}]`);
    requireString(navItem, 'description', `jobMarketLab.console.nav.items[${index}]`);
  }
  const consoleOverview = requireRecord(
    consoleCopy.overview,
    'jobMarketLab.console.overview',
  );
  requireString(consoleOverview, 'heading', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'description', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'areasHeading', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'statusHeading', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'lastRunLabel', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'lastRunEmpty', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'pendingHitlLabel', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'pendingHitlCount', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'pendingHitlEmpty', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'loadingLabel', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'errorLabel', 'jobMarketLab.console.overview');
  requireString(consoleOverview, 'openAreaLabel', 'jobMarketLab.console.overview');
  requireString(consoleCopy, 'runsHeading', 'jobMarketLab.console');
  requireString(consoleCopy, 'runsDescription', 'jobMarketLab.console');
  requireString(consoleCopy, 'runsEmpty', 'jobMarketLab.console');
  requireString(consoleCopy, 'runsLoading', 'jobMarketLab.console');
  requireString(consoleCopy, 'runsError', 'jobMarketLab.console');
  requireString(consoleCopy, 'runsDocsConsideredLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'runsEstimatedCostLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'runsReloadLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'runStatusQueued', 'jobMarketLab.console');
  requireString(consoleCopy, 'runStatusRunning', 'jobMarketLab.console');
  requireString(consoleCopy, 'runStatusSucceeded', 'jobMarketLab.console');
  requireString(consoleCopy, 'runStatusFailed', 'jobMarketLab.console');
  requireString(consoleCopy, 'failureReasonLabel', 'jobMarketLab.console');
  const analyticsWorkspace = requireRecord(
    consoleCopy.analyticsWorkspace,
    'jobMarketLab.console.analyticsWorkspace',
  );
  for (const key of [
    'heading',
    'description',
    'summaryHeading',
    'activeDocumentsLabel',
    'payDisclosedLabel',
    'payUndisclosedLabel',
    'employerLinkedLabel',
    'completeCompensationLabel',
    'startRecomputeHeading',
    'startRecomputeDescription',
    'viewRunsLabel',
    'secondaryToolsHeading',
    'secondaryToolsDescription',
  ] as const) {
    requireString(
      analyticsWorkspace,
      key,
      'jobMarketLab.console.analyticsWorkspace',
    );
  }
  const fitWorkspace = requireRecord(
    consoleCopy.fitWorkspace,
    'jobMarketLab.console.fitWorkspace',
  );
  for (const key of [
    'heading',
    'description',
    'loadingLabel',
    'errorLabel',
    'saveCvFirstHint',
    'modeRoleLabel',
    'modeMarketLabel',
    'jdSearchLabel',
    'jdSearchPlaceholder',
    'cvColumnHeading',
    'resultsHeading',
  ] as const) {
    requireString(fitWorkspace, key, 'jobMarketLab.console.fitWorkspace');
  }
  const cv = requireRecord(consoleCopy.cv, 'jobMarketLab.console.cv');
  requireString(cv, 'heading', 'jobMarketLab.console.cv');
  requireString(cv, 'description', 'jobMarketLab.console.cv');
  requireString(cv, 'loadingLabel', 'jobMarketLab.console.cv');
  requireString(cv, 'emptyHint', 'jobMarketLab.console.cv');
  requireString(cv, 'seedButtonLabel', 'jobMarketLab.console.cv');
  requireString(cv, 'seedingLabel', 'jobMarketLab.console.cv');
  requireString(cv, 'seededMessage', 'jobMarketLab.console.cv');
  requireString(cv, 'bodyLabel', 'jobMarketLab.console.cv');
  requireString(cv, 'saveButtonLabel', 'jobMarketLab.console.cv');
  requireString(cv, 'savingLabel', 'jobMarketLab.console.cv');
  requireString(cv, 'savedMessage', 'jobMarketLab.console.cv');
  requireString(cv, 'errorLabel', 'jobMarketLab.console.cv');
  const compare = requireRecord(consoleCopy.compare, 'jobMarketLab.console.compare');
  requireString(compare, 'heading', 'jobMarketLab.console.compare');
  requireString(compare, 'description', 'jobMarketLab.console.compare');
  requireString(compare, 'selectLabel', 'jobMarketLab.console.compare');
  requireString(compare, 'noSelectionOption', 'jobMarketLab.console.compare');
  requireString(compare, 'runButtonLabel', 'jobMarketLab.console.compare');
  requireString(compare, 'runningLabel', 'jobMarketLab.console.compare');
  requireString(compare, 'loadingJdsLabel', 'jobMarketLab.console.compare');
  requireString(compare, 'errorLabel', 'jobMarketLab.console.compare');
  requireString(compare, 'noCvError', 'jobMarketLab.console.compare');
  requireString(compare, 'noJdSelectedError', 'jobMarketLab.console.compare');
  requireString(compare, 'missingMarkdownError', 'jobMarketLab.console.compare');
  requireString(compare, 'matchesHeading', 'jobMarketLab.console.compare');
  requireString(compare, 'gapsHeading', 'jobMarketLab.console.compare');
  requireString(compare, 'talkingPointsHeading', 'jobMarketLab.console.compare');
  requireString(compare, 'learningTargetsHeading', 'jobMarketLab.console.compare');
  requireString(compare, 'matchesEmpty', 'jobMarketLab.console.compare');
  requireString(compare, 'gapsEmpty', 'jobMarketLab.console.compare');
  requireString(compare, 'talkingPointsEmpty', 'jobMarketLab.console.compare');
  requireString(compare, 'learningTargetsEmpty', 'jobMarketLab.console.compare');
  requireString(compare, 'matchTalkingPointTemplate', 'jobMarketLab.console.compare');
  requireString(compare, 'gapTalkingPointTemplate', 'jobMarketLab.console.compare');
  requireString(compare, 'gapLearningTargetTemplate', 'jobMarketLab.console.compare');
  const marketCompare = requireRecord(
    consoleCopy.marketCompare,
    'jobMarketLab.console.marketCompare',
  );
  requireString(marketCompare, 'heading', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'description', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'runButtonLabel', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'runningLabel', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'loadingPulseLabel', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'errorLabel', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'noCvError', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'noPulseError', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'matchesHeading', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'gapsHeading', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'talkingPointsHeading', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'learningTargetsHeading', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'matchesEmpty', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'gapsEmpty', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'talkingPointsEmpty', 'jobMarketLab.console.marketCompare');
  requireString(marketCompare, 'learningTargetsEmpty', 'jobMarketLab.console.marketCompare');
  requireString(
    marketCompare,
    'matchTalkingPointTemplate',
    'jobMarketLab.console.marketCompare',
  );
  requireString(
    marketCompare,
    'gapTalkingPointTemplate',
    'jobMarketLab.console.marketCompare',
  );
  requireString(
    marketCompare,
    'gapLearningTargetTemplate',
    'jobMarketLab.console.marketCompare',
  );
  requireString(consoleCopy, 'themeLabelsHeading', 'jobMarketLab.console');
  requireString(consoleCopy, 'themeLabelsDescription', 'jobMarketLab.console');
  requireString(consoleCopy, 'themeLabelsEmpty', 'jobMarketLab.console');
  requireString(consoleCopy, 'themeLabelsLoading', 'jobMarketLab.console');
  requireString(consoleCopy, 'themeLabelsError', 'jobMarketLab.console');
  requireString(consoleCopy, 'themeLabelInputLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'themeLabelSaveLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'themeLabelSavingLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'themeLabelSavedMessage', 'jobMarketLab.console');
  requireString(consoleCopy, 'themeLabelSizeLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersHeading', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersDescription', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersLoading', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersEmpty', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersError', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersTimeLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersAllOption', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersDocumentCountLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersTechnologiesLabel', 'jobMarketLab.console');
  requireString(consoleCopy, 'pulseFiltersThemesLabel', 'jobMarketLab.console');
  const consolePulseFilterTimeOptions = requireRecord(
    consoleCopy.pulseFilterTimeOptions,
    'jobMarketLab.console.pulseFilterTimeOptions',
  );
  requireString(consolePulseFilterTimeOptions, 'all', 'jobMarketLab.console.pulseFilterTimeOptions');
  requireString(consolePulseFilterTimeOptions, '3m', 'jobMarketLab.console.pulseFilterTimeOptions');
  requireString(consolePulseFilterTimeOptions, '6m', 'jobMarketLab.console.pulseFilterTimeOptions');
  requireString(consolePulseFilterTimeOptions, '12m', 'jobMarketLab.console.pulseFilterTimeOptions');
  requireString(consolePulseFilterTimeOptions, '18m', 'jobMarketLab.console.pulseFilterTimeOptions');
  const corpusWorkspace = requireRecord(
    consoleCopy.corpusWorkspace,
    'jobMarketLab.console.corpusWorkspace',
  );
  const corpusWorkspaceKeys = [
    'heading',
    'description',
    'loadingLabel',
    'errorLabel',
    'emptyLabel',
    'filteredEmptyLabel',
    'documentCountLabel',
    'searchLabel',
    'searchPlaceholder',
    'statusFilterLabel',
    'statusFilterAll',
    'statusFilterActive',
    'statusFilterArchived',
    'missingEmployerFilterLabel',
    'missingPayFilterLabel',
    'columnTitle',
    'columnStatus',
    'columnSeniority',
    'columnRoleFamily',
    'columnEmployer',
    'columnCompensation',
    'columnCollectedAt',
    'columnGaps',
    'columnActions',
    'statusActive',
    'statusArchived',
    'noEmployerOption',
    'unsetOption',
    'gapEmployer',
    'gapPay',
    'gapNone',
    'saveRowLabel',
    'savingRowLabel',
    'rowSavedMessage',
    'rowSaveError',
    'archiveLabel',
    'restoreLabel',
    'archivingLabel',
    'restoringLabel',
    'openDetailLabel',
    'closeDetailLabel',
    'detailHeading',
    'markdownLabel',
    'markdownLoading',
    'markdownError',
    'markdownMissingKey',
    'saveMarkdownLabel',
    'savingMarkdownLabel',
    'markdownSavedMessage',
    'markdownSaveError',
    'metadataHeading',
    'employerLabel',
    'employerUnsetWarning',
    'employerUnknownWarning',
    'frontmatterMergedNotice',
    'seniorityLabel',
    'roleFamilyLabel',
    'compensationDisclosureLabel',
    'compensationCurrencyLabel',
    'compensationMinLabel',
    'compensationMaxLabel',
    'compensationPeriodLabel',
    'sourceLabel',
    'saveMetadataLabel',
    'savingMetadataLabel',
    'metadataSavedMessage',
    'metadataSaveError',
    'registryHeading',
    'registryDescription',
    'registryExpandLabel',
    'registryCollapseLabel',
    'auditHeading',
    'auditDescription',
    'auditLoadingLabel',
    'auditErrorLabel',
    'auditJobDescriptionsLabel',
    'auditActiveLabel',
    'auditArchivedLabel',
    'auditMissingEmployerLabel',
    'auditMissingPayLabel',
    'auditEmployersLabel',
    'auditPendingIntakeLabel',
    'auditRunsLabel',
    'auditFailedRunsLabel',
    'employersButtonLabel',
    'employersModalHeading',
    'employersModalDescription',
    'employersModalCloseLabel',
    'employersNameLabel',
    'employersSizeLabel',
    'employersPrestigeLabel',
    'employersCreateLabel',
    'employersCreatingLabel',
    'employersSaveLabel',
    'employersSavingLabel',
    'employersEmpty',
    'employersCreatedMessage',
    'employersSavedMessage',
    'employersError',
  ] as const;
  for (const key of corpusWorkspaceKeys) {
    requireString(corpusWorkspace, key, 'jobMarketLab.console.corpusWorkspace');
  }
  const corpusDisclosureOptions = requireRecord(
    corpusWorkspace.compensationDisclosureOptions,
    'jobMarketLab.console.corpusWorkspace.compensationDisclosureOptions',
  );
  requireString(
    corpusDisclosureOptions,
    'range',
    'jobMarketLab.console.corpusWorkspace.compensationDisclosureOptions',
  );
  requireString(
    corpusDisclosureOptions,
    'competitive',
    'jobMarketLab.console.corpusWorkspace.compensationDisclosureOptions',
  );
  requireString(
    corpusDisclosureOptions,
    'unknown',
    'jobMarketLab.console.corpusWorkspace.compensationDisclosureOptions',
  );
}

export function assertValidLoginPage(data: unknown): void {
  const page = requireRecord(data, 'login');
  requireString(page, 'heading', 'login');
  requireString(page, 'description', 'login');
  requireString(page, 'emailLabel', 'login');
  requireString(page, 'passwordLabel', 'login');
  requireString(page, 'submitLabel', 'login');
  requireString(page, 'signOutLabel', 'login');
  requireString(page, 'signedInHeading', 'login');
  requireString(page, 'signedInDescription', 'login');
  const errors = requireRecord(page.errors, 'login.errors');
  requireString(errors, 'generic', 'login.errors');
  requireString(errors, 'notConfigured', 'login.errors');
  requireString(errors, 'required', 'login.errors');
}

export function assertValidFooter(data: unknown): void {
  const footer = requireRecord(data, 'footer');
  const contact = requireRecord(footer.contact, 'footer.contact');
  requireString(contact, 'heading', 'footer.contact');
  requireString(contact, 'description', 'footer.contact');
  requireString(contact, 'navigationTitle', 'footer.contact');
  requireString(contact, 'socialTitle', 'footer.contact');
  requireString(contact, 'email', 'footer.contact');
  requireString(contact, 'copyright', 'footer.contact');
  const social = requireRecord(contact.social, 'footer.contact.social');
  requireString(social, 'github', 'footer.contact.social');
  requireString(social, 'linkedin', 'footer.contact.social');
  const ownerSignIn = requireRecord(contact.ownerSignIn, 'footer.contact.ownerSignIn');
  requireString(ownerSignIn, 'label', 'footer.contact.ownerSignIn');
  requireString(ownerSignIn, 'href', 'footer.contact.ownerSignIn');
}

export function assertValidNavigation(data: unknown): void {
  const navigation = requireRecord(data, 'navigation');
  requireArray(navigation.links, 'navigation.links').forEach((link, index) => {
    const item = requireRecord(link, `navigation.links[${index}]`);
    requireString(item, 'label', `navigation.links[${index}]`);
    requireString(item, 'href', `navigation.links[${index}]`);
  });
}

export function assertValidSite(data: unknown): void {
  const site = requireRecord(data, 'site');
  requireString(site, 'brandName', 'site');
  requireString(site, 'locale', 'site');
  const metadata = requireRecord(site.metadata, 'site.metadata');
  requireString(metadata, 'title', 'site.metadata');
  requireString(metadata, 'description', 'site.metadata');
  requireString(metadata, 'author', 'site.metadata');
  requireString(metadata, 'siteUrl', 'site.metadata');
  requireString(metadata, 'socialHandle', 'site.metadata');
  const person = requireRecord(site.person, 'site.person');
  requireString(person, 'jobTitle', 'site.person');
  requireString(person, 'worksFor', 'site.person');
  requireString(person, 'alumniOf', 'site.person');
  requireString(person, 'profileDateCreated', 'site.person');
  requireArray(person.knowsAbout, 'site.person.knowsAbout').forEach((topic, index) => {
    if (typeof topic !== 'string') {
      fail(`site.person.knowsAbout[${index}]: expected string`);
    }
  });
}

export function assertValidCareerProfile(data: unknown): void {
  const profile = requireRecord(data, 'careerProfile');
  const experience = requireRecord(profile.experience, 'careerProfile.experience');
  requireArray(experience.companies, 'careerProfile.experience.companies').forEach(
    (company, index) => {
      const item = requireRecord(company, `careerProfile.experience.companies[${index}]`);
      requireString(item, 'name', `careerProfile.experience.companies[${index}]`);
      requireString(item, 'location', `careerProfile.experience.companies[${index}]`);
      requireArray(item.roles, `careerProfile.experience.companies[${index}].roles`);
    },
  );
  const education = requireRecord(profile.education, 'careerProfile.education');
  requireArray(education.entries, 'careerProfile.education.entries').forEach((entry, index) => {
    const item = requireRecord(entry, `careerProfile.education.entries[${index}]`);
    requireString(item, 'institution', `careerProfile.education.entries[${index}]`);
    requireString(item, 'qualification', `careerProfile.education.entries[${index}]`);
    requireString(item, 'period', `careerProfile.education.entries[${index}]`);
    requireString(item, 'description', `careerProfile.education.entries[${index}]`);
  });
  const certifications = requireRecord(profile.certifications, 'careerProfile.certifications');
  requireArray(certifications.items, 'careerProfile.certifications.items').forEach(
    (item, index) => {
      const cert = requireRecord(item, `careerProfile.certifications.items[${index}]`);
      requireString(cert, 'name', `careerProfile.certifications.items[${index}]`);
      requireString(cert, 'issuer', `careerProfile.certifications.items[${index}]`);
      requireString(cert, 'issued', `careerProfile.certifications.items[${index}]`);
    },
  );
}
