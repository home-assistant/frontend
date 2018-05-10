export default function parseQuery(queryString) {
  const query = {};
  const items = queryString.split('&');
  for (let i = 0; i < items.length; i++) {
    const item = items[i].split('=');
    const key = decodeURIComponent(item[0]);
    const value = item.length > 1 ? decodeURIComponent(item[1]) : undefined;
    query[key] = value;
  }
  return query;
}
