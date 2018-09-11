export const fetchWithAuth = async (auth, input, init = {}) => {
  if (auth.expired) await auth.refreshAccessToken();
  init.credentials = 'same-origin';
  if (!init.headers) {
    init.headers = {};
  }
  init.headers.authorization = `Bearer ${auth.accessToken}`;
  return await fetch(input, init);
};
