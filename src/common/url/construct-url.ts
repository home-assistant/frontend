export const constructUrlCurrentHref = (searchParams: string): string => {
  const base = window.location.href.split("?")[0];
  return searchParams ? base + "?" + searchParams : base;
};
