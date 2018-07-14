export default function refreshAccessToken(clientId, refreshToken) {
  const data = new FormData();
  data.append('client_id', clientId);
  data.append('grant_type', 'refresh_token');
  data.append('refresh_token', refreshToken);
  return fetch('/auth/token', {
    method: 'POST',
    body: data,
  }).then((resp) => {
    if (!resp.ok) throw new Error('Unable to fetch tokens');
    const tokens = resp.json();
    // shorten access token life 30 seconds to cover network cost
    tokens.expires = ((tokens.expires_in - 30) * 1000) + Date.now();
    return tokens;
  });
}
