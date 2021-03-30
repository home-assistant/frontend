export const constructUrlCurrentHref = (searchParams: string): string => {
  const base = window.location.href.split("?")[0];
  // Prevent trailing "?" if no parameters exist
  return searchParams ? base + "?" + searchParams : base;
};
