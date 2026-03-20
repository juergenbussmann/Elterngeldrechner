import type { PwaFactoryAiPipeline, PwaFactoryApiAdapter } from '../contracts/moduleContract';
import { getAiPipelines, getApiAdapters } from '../modules/moduleHost';

let apiAdapters: Map<string, PwaFactoryApiAdapter> = new Map();
let aiPipelines: Map<string, PwaFactoryAiPipeline> = new Map();

export const initIntegrations = (): void => {
  apiAdapters = new Map();
  aiPipelines = new Map();

  getApiAdapters().forEach((adapter) => {
    apiAdapters.set(adapter.id, adapter);
  });

  getAiPipelines().forEach((pipeline) => {
    aiPipelines.set(pipeline.id, pipeline);
  });
};

export const getApiAdapter = (id: string): PwaFactoryApiAdapter | undefined => {
  return apiAdapters.get(id);
};

export const getAiPipeline = (id: string): PwaFactoryAiPipeline | undefined => {
  return aiPipelines.get(id);
};

