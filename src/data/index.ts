import homeData from './pages/home.json';
import footerData from './common/footer.json';
import navigationData from './common/navigation.json';
import siteData from './common/site.json';

import type {
  HomePageData,
  FooterData,
  NavigationData,
  SiteData,
} from './types';

// Page data exports
export const home = homeData as HomePageData;

// Common data exports
export const footer = footerData as FooterData;
export const navigation = navigationData as NavigationData;
export const site = siteData as SiteData;

// Helper function to get page data by route
export function getPageData(route: string) {
  switch (route) {
    case '/':
    case '/home':
      return home;
    default:
      return null;
  }
}

// Helper function to get all common data at once
export function getCommonData() {
  return {
    footer,
    navigation,
    site,
  };
}

// Export all types
export type * from './types';

