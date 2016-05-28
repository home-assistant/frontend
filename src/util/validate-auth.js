export default function (hass, authToken, rememberAuth) {
  hass.authActions.validate(authToken, {
    rememberAuth,
    useStreaming: hass.localStoragePreferences.useStreaming,
  });
}
