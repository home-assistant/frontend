const DEFAULT_LOCAL_WORKERS = "60%";

export const getE2EWorkers = (): number | string => {
  if (process.env.CI) {
    return 1;
  }

  const workers = process.env.E2E_WORKERS;
  if (!workers) {
    return DEFAULT_LOCAL_WORKERS;
  }

  return /^[1-9]\d*$/.test(workers) ? Number(workers) : workers;
};
