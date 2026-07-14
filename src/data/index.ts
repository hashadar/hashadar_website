import homeData from './pages/home.json';
import portfolioData from './pages/portfolio.json';
import aboutData from './pages/about.json';
import blogData from './pages/blog.json';
import labsData from './pages/labs.json';
import jobMarketLabData from './pages/job-market-lab.json';
import footerData from './common/footer.json';
import navigationData from './common/navigation.json';
import siteData from './common/site.json';
import careerProfileData from './profile/career-profile.json';

import type {
  HomePageData,
  PortfolioPageData,
  AboutPageData,
  BlogPageData,
  LabsPageData,
  JobMarketLabPageData,
  CareerProfile,
  FooterData,
  NavigationData,
  SiteData,
} from './types';
import {
  assertValidAboutPage,
  assertValidBlogPage,
  assertValidCareerProfile,
  assertValidFooter,
  assertValidHomePage,
  assertValidJobMarketLabPage,
  assertValidLabsPage,
  assertValidNavigation,
  assertValidPortfolioPage,
  assertValidSite,
  validateDataFile,
} from './validate';

validateDataFile('pages/home.json', homeData, assertValidHomePage);
validateDataFile('pages/portfolio.json', portfolioData, assertValidPortfolioPage);
validateDataFile('pages/about.json', aboutData, assertValidAboutPage);
validateDataFile('pages/blog.json', blogData, assertValidBlogPage);
validateDataFile('pages/labs.json', labsData, assertValidLabsPage);
validateDataFile('pages/job-market-lab.json', jobMarketLabData, assertValidJobMarketLabPage);
validateDataFile('common/footer.json', footerData, assertValidFooter);
validateDataFile('common/navigation.json', navigationData, assertValidNavigation);
validateDataFile('common/site.json', siteData, assertValidSite);
validateDataFile('profile/career-profile.json', careerProfileData, assertValidCareerProfile);

export const home = homeData as HomePageData;
export const portfolio = portfolioData as PortfolioPageData;
export const about = aboutData as AboutPageData;
export const blog = blogData as BlogPageData;
export const labs = labsData as LabsPageData;
export const jobMarketLab = jobMarketLabData as JobMarketLabPageData;
export const careerProfile = careerProfileData as CareerProfile;

export { getHomeExperienceView, getAboutExperienceView } from './profile/experience-slices';
export { getAboutCertificationsView } from './profile/certifications-slices';
export { getAboutEducationView } from './profile/education-slices';
export { getAboutCareerViews } from './profile/about-career-slices';
export type { AboutCareerViews } from './profile/about-career-slices';

export const footer = footerData as FooterData;
export const navigation = navigationData as NavigationData;
export const site = siteData as SiteData;

export function getPageData(route: '/'): HomePageData;
export function getPageData(route: '/home'): HomePageData;
export function getPageData(route: '/about'): AboutPageData;
export function getPageData(route: '/blog'): BlogPageData;
export function getPageData(route: '/portfolio'): PortfolioPageData;
export function getPageData(route: '/labs'): LabsPageData;
export function getPageData(route: '/labs/job-market'): JobMarketLabPageData;
export function getPageData(
  route: string,
):
  | HomePageData
  | AboutPageData
  | BlogPageData
  | PortfolioPageData
  | LabsPageData
  | JobMarketLabPageData
  | null;
export function getPageData(route: string) {
  switch (route) {
    case '/':
    case '/home':
      return home;
    case '/blog':
      return blog;
    case '/portfolio':
      return portfolio;
    case '/about':
      return about;
    case '/labs':
      return labs;
    case '/labs/job-market':
      return jobMarketLab;
    default:
      return null;
  }
}

export function getCommonData() {
  return {
    footer,
    navigation,
    site,
  };
}

export type * from './types';
