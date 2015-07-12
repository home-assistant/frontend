import { authActions, localStoragePreferences } from 'home-assistant-js';

export default function(authToken, rememberAuth) {
  authActions.validate(authToken, {
    rememberAuth,
    useStreaming: localStoragePreferences.useStreaming,
  });
}
