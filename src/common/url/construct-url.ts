export const constructUrl = (base: string, searchParams?: string): string => {
  // Prevent trailing "?" if no parameters exist
  return searchParams ? base + "?" + searchParams : base;
};

export const constructUrlCurrentHref = (searchParams: string): string => {
  const base = window.location.pathname;
  // Prevent trailing "?" if no parameters exist
  return searchParams ? base + "?" + searchParams : base;
};
