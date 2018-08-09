export default function fetchToken(clientId, code) {
  const data = new FormData();
  data.append('client_id', clientId);
  data.append('grant_type', 'authorization_code');
  data.append('code', code);
  return fetch('/auth/token', {
    credentials: 'same-origin',
    method: 'POST',
    body: data,
  }).then((resp) => {
    if (!resp.ok) throw new Error('Unable to fetch tokens');
    return resp.json().then((tokens) => {
      tokens.expires = (tokens.expires_in * 1000) + Date.now();
      return tokens;
    });
  });
}
