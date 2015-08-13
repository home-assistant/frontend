import { authActions, localStoragePreferences } from '../util/home-assistant-js-instance';

export default function(authToken, rememberAuth) {
  authActions.validate(authToken, {
    rememberAuth,
    useStreaming: localStoragePreferences.useStreaming,
  });
}
