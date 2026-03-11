import type { PwaFactoryNavItem } from '../contracts/moduleContract';
import { getNavItems } from '../modules/moduleHost';

export const getAppNavItems = (): PwaFactoryNavItem[] => {
  return getNavItems();
};

