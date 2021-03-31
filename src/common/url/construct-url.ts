export const constructUrlCurrentPath = (searchParams: string): string => {
  const base = window.location.pathname;
  // Prevent trailing "?" if no parameters exist
  return searchParams ? base + "?" + searchParams : base;
};
