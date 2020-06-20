export const extractSearchParamsObject = (): { [key: string]: string } => {
  const query = {};
  const searchParams = new URLSearchParams(location.search);
  for (const [key, value] of searchParams.entries()) {
    query[key] = value;
  }
  return query;
};
