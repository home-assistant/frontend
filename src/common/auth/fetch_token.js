export default function fetchToken(clientId, code) {
  const data = new FormData();
  data.append('grant_type', 'authorization_code');
  data.append('code', code);
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
