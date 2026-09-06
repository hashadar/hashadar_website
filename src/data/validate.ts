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

const HOME_ROLE_COUNT = 4;
const PROOF_MEDIA = new Set(['loop', 'photo']);

function assertClaimRole(value: unknown, context: string): Record<string, unknown> {
  const role = requireRecord(value, context);
  requireString(role, 'id', context);
  requireString(role, 'question', context);
  return role;
}

function assertProofDoor(value: unknown, context: string): Record<string, unknown> {
  const door = requireRecord(value, context);
  requireString(door, 'id', context);
  requireString(door, 'label', context);
  requireString(door, 'href', context);
  const media = requireString(door, 'media', context);
  if (!PROOF_MEDIA.has(media)) {
    fail(`${context}: media must be "loop" or "photo"`);
  }
  if (media === 'loop') {
    requireString(door, 'src', context);
  }
  return door;
}

export function assertValidHomePage(data: unknown): void {
  const page = requireRecord(data, 'home');
  for (const retired of ['hero', 'about', 'photography', 'blog', 'experience'] as const) {
    if (page[retired] !== undefined) {
      fail(`home: unexpected catalogue block "${retired}"`);
    }
  }

  const claim = requireRecord(page.claim, 'home.claim');
  const lockup = requireArray(claim.lockup, 'home.claim.lockup');
  if (lockup.length !== 2 || lockup.some((line) => typeof line !== 'string' || line.length === 0)) {
    fail('home.claim.lockup: expected two non-empty strings');
  }
  requireString(claim, 'landingLine', 'home.claim');
  requireString(claim, 'loopSrc', 'home.claim');
  if (claim.loopObjectPosition !== undefined) {
    requireString(claim, 'loopObjectPosition', 'home.claim');
  }

  const roles = requireArray(claim.roles, 'home.claim.roles');
  if (roles.length !== HOME_ROLE_COUNT) {
    fail(`home.claim.roles: expected ${HOME_ROLE_COUNT} roles`);
  }
  const roleIds = roles.map((role, index) => assertClaimRole(role, `home.claim.roles[${index}]`).id);

  const statement = requireRecord(page.statement, 'home.statement');
  requireString(statement, 'headline', 'home.statement');
  requireString(statement, 'paragraph', 'home.statement');
  assertCta(statement.cta, 'home.statement.cta');

  const proof = requireRecord(page.proof, 'home.proof');
  const doors = requireArray(proof.doors, 'home.proof.doors');
  if (doors.length !== HOME_ROLE_COUNT) {
    fail(`home.proof.doors: expected ${HOME_ROLE_COUNT} doors`);
  }
  doors.forEach((door, index) => {
    const entry = assertProofDoor(door, `home.proof.doors[${index}]`);
    if (entry.id !== roleIds[index]) {
      fail(`home.proof.doors[${index}].id must match home.claim.roles[${index}].id`);
    }
  });
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
  requireString(page, 'catalogueAriaLabel', 'labs');
  requireArray(page.labs, 'labs.labs').forEach((lab, index) => {
    const item = requireRecord(lab, `labs.labs[${index}]`);
    requireString(item, 'title', `labs.labs[${index}]`);
    requireString(item, 'lede', `labs.labs[${index}]`);
    requireString(item, 'description', `labs.labs[${index}]`);
    requireString(item, 'href', `labs.labs[${index}]`);
    requireString(item, 'ctaLabel', `labs.labs[${index}]`);
  });
}

export function assertValidWmwPage(data: unknown): void {
  const page = requireRecord(data, 'wmw');
  requireString(page, 'heading', 'wmw');
  requireString(page, 'description', 'wmw');
  requireString(page, 'unauthenticatedHeading', 'wmw');
  requireString(page, 'unauthenticatedDescription', 'wmw');
  requireString(page, 'signInLabel', 'wmw');
  requireString(page, 'checkingSessionLabel', 'wmw');

  const shell = requireRecord(page.shell, 'wmw.shell');
  requireString(shell, 'heading', 'wmw.shell');
  requireString(shell, 'description', 'wmw.shell');
  const nav = requireRecord(shell.nav, 'wmw.shell.nav');
  requireString(nav, 'ariaLabel', 'wmw.shell.nav');
  requireString(nav, 'mobileLabel', 'wmw.shell.nav');
  requireString(nav, 'accountsGroupLabel', 'wmw.shell.nav');
  requireString(nav, 'accountsEmptyLabel', 'wmw.shell.nav');
  requireString(nav, 'inactiveAccountsGroupLabel', 'wmw.shell.nav');
  requireString(nav, 'inactiveAccountsEmptyLabel', 'wmw.shell.nav');
  requireArray(nav.items, 'wmw.shell.nav.items').forEach((item, index) => {
    const entry = requireRecord(item, `wmw.shell.nav.items[${index}]`);
    requireString(entry, 'id', `wmw.shell.nav.items[${index}]`);
    requireString(entry, 'label', `wmw.shell.nav.items[${index}]`);
    requireString(entry, 'href', `wmw.shell.nav.items[${index}]`);
  });

  const overview = requireRecord(page.overview, 'wmw.overview');
  requireString(overview, 'heading', 'wmw.overview');
  requireString(overview, 'description', 'wmw.overview');
  requireString(overview, 'loadingLabel', 'wmw.overview');
  requireString(overview, 'errorLabel', 'wmw.overview');
  requireString(overview, 'emptyHeading', 'wmw.overview');
  requireString(overview, 'emptyDescription', 'wmw.overview');
  requireString(overview, 'refreshLabel', 'wmw.overview');
  requireString(overview, 'refreshingLabel', 'wmw.overview');
  requireString(overview, 'asOfLabel', 'wmw.overview');
  requireString(overview, 'asOfUnknownLabel', 'wmw.overview');
  requireString(overview, 'refreshErrorLastGoodLabel', 'wmw.overview');
  requireString(overview, 'refreshErrorEmptyLabel', 'wmw.overview');
  requireString(overview, 'refreshErrorMissingTabLabel', 'wmw.overview');
  requireString(overview, 'warningsLabel', 'wmw.overview');
  requireString(overview, 'warningsDescription', 'wmw.overview');
  requireString(overview, 'netWorthHeading', 'wmw.overview');
  requireString(overview, 'kpiCashSavingsLabel', 'wmw.overview');
  requireString(overview, 'kpiGeneralInvestmentsLabel', 'wmw.overview');
  requireString(overview, 'kpiRetirementLabel', 'wmw.overview');
  requireString(overview, 'historyHeading', 'wmw.overview');
  requireString(overview, 'classMixHeading', 'wmw.overview');
  requireString(overview, 'classHeading', 'wmw.overview');
  requireString(overview, 'accountHeading', 'wmw.overview');
  requireString(overview, 'monthSlicerLabel', 'wmw.overview');
  requireString(overview, 'accountSearchLabel', 'wmw.overview');
  requireString(overview, 'columnPct', 'wmw.overview');
  requireString(overview, 'columnMom', 'wmw.overview');
  requireString(overview, 'pairsHeading', 'wmw.overview');
  requireString(overview, 'periodYtd', 'wmw.overview');
  requireString(overview, 'period1y', 'wmw.overview');
  requireString(overview, 'periodMax', 'wmw.overview');
  const mwrReasons = requireRecord(overview.mwrReasons, 'wmw.overview.mwrReasons');
  requireString(mwrReasons, 'no-usable-cashflows', 'wmw.overview.mwrReasons');
  requireString(mwrReasons, 'irr-failed', 'wmw.overview.mwrReasons');

  const accountDetail = requireRecord(page.accountDetail, 'wmw.accountDetail');
  requireString(accountDetail, 'heading', 'wmw.accountDetail');
  requireString(accountDetail, 'description', 'wmw.accountDetail');
  requireString(accountDetail, 'loadingLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'errorLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'notFoundHeading', 'wmw.accountDetail');
  requireString(accountDetail, 'notFoundDescription', 'wmw.accountDetail');
  requireString(accountDetail, 'backToOverviewLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'metadataHeading', 'wmw.accountDetail');
  requireString(accountDetail, 'latestBalanceLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'seriesHeading', 'wmw.accountDetail');
  requireString(accountDetail, 'seriesViewAriaLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'seriesViewBalanceLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'seriesViewPerformanceLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'balanceChartAriaLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'performanceChartAriaLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'cashflowsHeading', 'wmw.accountDetail');
  requireString(accountDetail, 'cashflowsCountLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'cashflowsNetLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'cashflowsLastLabel', 'wmw.accountDetail');
  requireString(accountDetail, 'unitsHeading', 'wmw.accountDetail');
  requireString(accountDetail, 'mileageHeading', 'wmw.accountDetail');
  requireString(accountDetail, 'mwrHeading', 'wmw.accountDetail');
}

export function assertValidJobOsPage(data: unknown): void {
  const page = requireRecord(data, 'job-os');
  requireString(page, 'heading', 'job-os');
  requireString(page, 'description', 'job-os');
  requireString(page, 'unauthenticatedHeading', 'job-os');
  requireString(page, 'unauthenticatedDescription', 'job-os');
  requireString(page, 'signInLabel', 'job-os');
  requireString(page, 'checkingSessionLabel', 'job-os');

  const shell = requireRecord(page.shell, 'job-os.shell');
  requireString(shell, 'heading', 'job-os.shell');
  requireString(shell, 'description', 'job-os.shell');
  const nav = requireRecord(shell.nav, 'job-os.shell.nav');
  requireString(nav, 'ariaLabel', 'job-os.shell.nav');
  requireString(nav, 'mobileLabel', 'job-os.shell.nav');
  requireArray(nav.items, 'job-os.shell.nav.items').forEach((item, index) => {
    const entry = requireRecord(item, `job-os.shell.nav.items[${index}]`);
    requireString(entry, 'id', `job-os.shell.nav.items[${index}]`);
    requireString(entry, 'label', `job-os.shell.nav.items[${index}]`);
    requireString(entry, 'href', `job-os.shell.nav.items[${index}]`);
  });

  const overview = requireRecord(page.overview, 'job-os.overview');
  requireString(overview, 'heading', 'job-os.overview');
  requireString(overview, 'description', 'job-os.overview');
  requireString(overview, 'loadingLabel', 'job-os.overview');
  requireString(overview, 'errorLabel', 'job-os.overview');
  requireString(overview, 'emptyList', 'job-os.overview');
  requireString(overview, 'emptyOpportunitiesCta', 'job-os.overview');
  requireString(overview, 'columnEmployer', 'job-os.overview');
  requireString(overview, 'columnOpportunity', 'job-os.overview');
  requireString(overview, 'columnStatus', 'job-os.overview');
  requireString(overview, 'columnTracking', 'job-os.overview');
  requireString(overview, 'noTrackingNoteLabel', 'job-os.overview');
  requireString(overview, 'untitledOpportunityLabel', 'job-os.overview');
  const overviewStatusOptions = requireRecord(
    overview.statusOptions,
    'job-os.overview.statusOptions',
  );
  requireString(overviewStatusOptions, 'researching', 'job-os.overview.statusOptions');
  requireString(overviewStatusOptions, 'applied', 'job-os.overview.statusOptions');
  requireString(
    overviewStatusOptions,
    'interviewing',
    'job-os.overview.statusOptions',
  );
  requireString(overviewStatusOptions, 'offer', 'job-os.overview.statusOptions');
  const overviewStatusHints = requireRecord(
    overview.statusHints,
    'job-os.overview.statusHints',
  );
  requireString(
    overviewStatusHints,
    'researching',
    'job-os.overview.statusHints',
  );

  const employers = requireRecord(page.employers, 'job-os.employers');
  requireString(employers, 'heading', 'job-os.employers');
  requireString(employers, 'description', 'job-os.employers');
  requireString(employers, 'createLabel', 'job-os.employers');
  requireString(employers, 'ensureAnonLabel', 'job-os.employers');

  const opportunities = requireRecord(page.opportunities, 'job-os.opportunities');
  requireString(opportunities, 'heading', 'job-os.opportunities');
  requireString(opportunities, 'passLabel', 'job-os.opportunities');
  requireString(opportunities, 'pursueLabel', 'job-os.opportunities');

  const applications = requireRecord(page.applications, 'job-os.applications');
  requireString(applications, 'heading', 'job-os.applications');
  requireString(applications, 'trackingNoteLabel', 'job-os.applications');
  requireString(applications, 'saveStatusLabel', 'job-os.applications');

  const lists = requireRecord(page.lists, 'job-os.lists');
  requireString(lists, 'heading', 'job-os.lists');
  requireString(lists, 'addLabel', 'job-os.lists');
  requireRecord(lists.kindLabels, 'job-os.lists.kindLabels');

  const profile = requireRecord(page.profile, 'job-os.profile');
  requireString(profile, 'heading', 'job-os.profile');
  requireString(profile, 'saveLabel', 'job-os.profile');
  requireString(profile, 'bodyLabel', 'job-os.profile');

  requireString(opportunities, 'focusChecklistHeading', 'job-os.opportunities');
  requireString(opportunities, 'analyseLabel', 'job-os.opportunities');
  requireRecord(
    opportunities.checklistDimensionLabels,
    'job-os.opportunities.checklistDimensionLabels',
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
  requireString(contact, 'email', 'footer.contact');
  requireString(contact, 'copyright', 'footer.contact');
  const social = requireRecord(contact.social, 'footer.contact.social');
  requireString(social, 'github', 'footer.contact.social');
  requireString(social, 'linkedin', 'footer.contact.social');
  assertCta(contact.admin, 'footer.contact.admin');
}

export function assertValidAdminPage(data: unknown): void {
  const page = requireRecord(data, 'admin');
  requireString(page, 'heading', 'admin');
  requireString(page, 'description', 'admin');
  requireString(page, 'postsHeading', 'admin');
  requireString(page, 'photosHeading', 'admin');
  requireString(page, 'homePhotoHeading', 'admin');
  requireString(page, 'signOutLabel', 'admin');
  requireString(page, 'checkingSessionLabel', 'admin');
  requireString(page, 'unauthenticatedHeading', 'admin');
  requireString(page, 'unauthenticatedDescription', 'admin');
  requireString(page, 'signInLabel', 'admin');
  requireRecord(page.posts, 'admin.posts');
  requireRecord(page.photos, 'admin.photos');
  requireRecord(page.homePhoto, 'admin.homePhoto');
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
