export const constructUrlCurrentPath = (searchParams: string): string => {
  const base = window.location.pathname;
  const hash = __DEMO__ ? window.location.hash : "";
  // Prevent trailing "?" if no parameters exist
  return `${searchParams ? `${base}?${searchParams}` : base}${hash}`;
};
