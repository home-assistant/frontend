import hass from '../util/home-assistant-js-instance';

const { authActions, localStoragePreferences } = hass;

export default function (authToken, rememberAuth) {
  authActions.validate(authToken, {
    rememberAuth,
    useStreaming: localStoragePreferences.useStreaming,
  });
}
