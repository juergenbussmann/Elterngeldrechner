import type { PwaFactoryModule } from '../../../core/contracts/moduleContract';
import { getActiveModules, getModuleById as getModuleFromHost } from '../../../core/modules/moduleHost';

export const listModules = (): PwaFactoryModule[] => getActiveModules();

export const getModuleById = (id: string): PwaFactoryModule | undefined =>
  getModuleFromHost(id);
