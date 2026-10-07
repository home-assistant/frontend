import type { OwnProfileMutableParams } from "../../../src/data/person";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockAuth = (hass: MockHomeAssistant) => {
  hass.mockWS("config/auth/list", () => []);
  hass.mockWS("auth/refresh_tokens", () => []);
  hass.mockWS("auth/sign_path", (msg: { path: string }) => ({
    path: msg.path,
  }));

  // Answer with the current user, so changes to hass.user, like a non-admin
  // scenario, are not undone when the user subscription refreshes.
  hass.mockWS(
    "auth/current_user",
    (_msg, currentHass: MockHomeAssistant) => currentHass.user
  );
  hass.mockWS(
    "person/update_own_profile",
    (msg: Partial<OwnProfileMutableParams>, currentHass: MockHomeAssistant) => {
      const user = {
        ...currentHass.user!,
        ...(msg.name && { name: msg.name }),
      };
      currentHass.updateHass({ user });
      return { user_name: user.name, person: null };
    }
  );
};
