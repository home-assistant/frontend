import type { OwnProfileMutableParams } from "../../../src/data/person";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockAuth = (hass: MockHomeAssistant) => {
  hass.mockWS("config/auth/list", () => []);
  hass.mockWS("auth/refresh_tokens", () => []);
  hass.mockWS("auth/sign_path", (msg: { path: string }) => ({
    path: msg.path,
  }));

  let user = hass.user!;
  // The profile dialog refreshes the user subscription after saving, which
  // writes the updated user back to hass.user.
  hass.mockWS("auth/current_user", () => user);
  hass.mockWS(
    "person/update_own_profile",
    (msg: Partial<OwnProfileMutableParams>) => {
      if (msg.name) {
        user = { ...user, name: msg.name };
      }
      return { user_name: user.name, person: null };
    }
  );
};
