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
  requireArray(page.labs, 'labs.labs').forEach((lab, index) => {
    const item = requireRecord(lab, `labs.labs[${index}]`);
    requireString(item, 'title', `labs.labs[${index}]`);
    requireString(item, 'description', `labs.labs[${index}]`);
    requireString(item, 'href', `labs.labs[${index}]`);
  });
}

export function assertValidJobMarketLabPage(data: unknown): void {
  const page = requireRecord(data, 'jobMarketLab');
  requireString(page, 'heading', 'jobMarketLab');
  requireString(page, 'description', 'jobMarketLab');
  requireString(page, 'emptyState', 'jobMarketLab');
  requireString(page, 'corpusNote', 'jobMarketLab');
  requireString(page, 'metricsHeading', 'jobMarketLab');
  requireString(page, 'documentCountLabel', 'jobMarketLab');
  requireString(page, 'publishedAtLabel', 'jobMarketLab');
  requireString(page, 'skillsHeading', 'jobMarketLab');
  requireString(page, 'taxonomyHeading', 'jobMarketLab');
  requireString(page, 'seniorityLabel', 'jobMarketLab');
  requireString(page, 'roleFamilyLabel', 'jobMarketLab');
  requireString(page, 'clustersHeading', 'jobMarketLab');
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
