const DEFAULT_LOCAL_WORKERS = "60%";
const VALID_WORKERS = /^[1-9]\d*%?$/;

export const getE2EWorkers = (): number | string => {
  if (process.env.CI) {
    return 1;
  }

  const workers = process.env.E2E_WORKERS;
  if (!workers) {
    return DEFAULT_LOCAL_WORKERS;
  }

  if (!VALID_WORKERS.test(workers)) {
    throw new Error(
      `E2E_WORKERS must be a positive integer or percentage, received "${workers}".`
    );
  }

  return workers.endsWith("%") ? workers : Number(workers);
};
