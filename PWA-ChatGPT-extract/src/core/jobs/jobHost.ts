import type { PwaFactoryJob } from '../contracts/moduleContract';
import { getJobs } from '../modules/moduleHost';

let isRunning = false;
const jobIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

const runJobSafely = async (job: PwaFactoryJob): Promise<void> => {
  try {
    await job.run();
  } catch (error) {
    console.error(`Job "${job.id}" failed`, error);
  }
};

export const stopJobs = (): void => {
  jobIntervals.forEach((intervalId) => {
    clearInterval(intervalId);
  });
  jobIntervals.clear();
  isRunning = false;
};

export const initJobs = (): void => {
  if (isRunning) {
    return;
  }

  stopJobs();

  getJobs().forEach((job) => {
    if (job.runOnStart) {
      void runJobSafely(job);
    }

    if (typeof job.intervalMs === 'number' && job.intervalMs > 0) {
      const intervalId = setInterval(() => {
        void runJobSafely(job);
      }, job.intervalMs);
      jobIntervals.set(job.id, intervalId);
    }
  });

  isRunning = true;
};

