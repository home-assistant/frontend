import type { OwnProfileMutableParams } from "../../../src/data/person";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockAuth = (hass: MockHomeAssistant) => {
  hass.mockWS("config/auth/list", () => []);
  hass.mockWS("auth/refresh_tokens", () => []);
  hass.mockWS("auth/sign_path", (msg: { path: string }) => ({
    path: msg.path,
  }));

  let name: string | undefined;
  // The profile dialog refreshes the user subscription after saving, which
  // writes the updated user back to hass.user. Read the current user on each
  // call so later changes to it, such as a non-admin user, are kept.
  hass.mockWS("auth/current_user", (_msg, currentHass: MockHomeAssistant) =>
    name && currentHass.user ? { ...currentHass.user, name } : currentHass.user
  );
  hass.mockWS(
    "person/update_own_profile",
    (msg: Partial<OwnProfileMutableParams>, currentHass: MockHomeAssistant) => {
      if (msg.name) {
        name = msg.name;
      }

      return { user_name: name ?? currentHass.user?.name, person: null };
    }
  );
};
