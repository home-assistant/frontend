export default function refreshAccessToken(clientId, refreshToken) {
  const data = new FormData();
  data.append('grant_type', 'refresh_token');
  data.append('refresh_token', refreshToken);
  return fetch('/auth/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(clientId)}`
    },
    body: data,
  }).then((resp) => {
    if (!resp.ok) throw new Error('Unable to fetch tokens');
    return resp.json();
  });
}
