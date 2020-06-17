interface AuthParams {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
}

export const extractAuthParams = () => {
  const query: AuthParams = {};
  const values = location.search.substr(1).split("&");
  for (const item of values) {
    const value = item.split("=");
    if (value.length > 1) {
      query[decodeURIComponent(value[0])] = decodeURIComponent(value[1]);
    }
  }
  return query;
};
