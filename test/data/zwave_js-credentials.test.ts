import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getZwaveCredentialCapabilities,
  getZwaveUsers,
  setZwaveUser,
  clearZwaveUser,
  clearZwaveAllUsers,
  setZwaveCredential,
  clearZwaveCredential,
  clearZwaveAllCredentials,
} from "../../src/data/zwave_js-credentials";
import type { HomeAssistant } from "../../src/types";

const ENTITY_ID = "lock.zwave_front_door";

const mockHass = (response?: unknown) =>
  ({
    callService: vi
      .fn()
      .mockResolvedValue(
        response !== undefined ? { response } : { response: undefined }
      ),
  }) as unknown as HomeAssistant;

describe("zwave_js-credentials", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getZwaveCredentialCapabilities", () => {
    it("calls the correct service with entity_id target and returnResponse", async () => {
      const capabilities = {
        supports_user_management: true,
        max_users: 20,
        supported_user_types: ["general", "programming", "remote_only"],
        max_user_name_length: 20,
        supported_credential_rules: ["single", "dual", "triple"],
        supported_credential_types: {
          pin_code: {
            num_slots: 10,
            min_length: 4,
            max_length: 10,
            supports_learn: false,
          },
          rfid_code: {
            num_slots: 5,
            min_length: 1,
            max_length: 32,
            supports_learn: true,
          },
        },
      };
      const hass = mockHass({ [ENTITY_ID]: capabilities });

      const result = await getZwaveCredentialCapabilities(hass, ENTITY_ID);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "get_credential_capabilities",
        {},
        { entity_id: ENTITY_ID },
        false,
        true
      );
      expect(result).toEqual(capabilities);
    });

    it("propagates errors from callService", async () => {
      const hass = {
        callService: vi
          .fn()
          .mockRejectedValue(new Error("Service unavailable")),
      } as unknown as HomeAssistant;

      await expect(
        getZwaveCredentialCapabilities(hass, ENTITY_ID)
      ).rejects.toThrow("Service unavailable");
    });
  });

  describe("getZwaveUsers", () => {
    it("calls the correct service with entity_id target and returnResponse", async () => {
      const usersResponse = {
        max_users: 20,
        users: [
          {
            user_id: 1,
            user_name: "Alice",
            active: true,
            user_type: "general",
            credential_rule: "single",
            credentials: [
              { type: "pin_code", slot: 1, data: null },
              { type: "finger_biometric", slot: 1, data: null },
            ],
          },
        ],
      };
      const hass = mockHass({ [ENTITY_ID]: usersResponse });

      const result = await getZwaveUsers(hass, ENTITY_ID);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "get_users",
        {},
        { entity_id: ENTITY_ID },
        false,
        true
      );
      expect(result).toEqual(usersResponse);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].user_name).toBe("Alice");
      expect(result.users[0].credentials).toHaveLength(2);
    });

    it("propagates errors from callService", async () => {
      const hass = {
        callService: vi.fn().mockRejectedValue(new Error("Not supported")),
      } as unknown as HomeAssistant;

      await expect(getZwaveUsers(hass, ENTITY_ID)).rejects.toThrow(
        "Not supported"
      );
    });
  });

  describe("setZwaveUser", () => {
    const setUserResponse = (inner: unknown) =>
      ({
        callService: vi
          .fn()
          .mockResolvedValue({ response: { [ENTITY_ID]: inner } }),
      }) as unknown as HomeAssistant;

    it("unwraps the entity_id-keyed response and returns user_id", async () => {
      const hass = setUserResponse({ user_id: 5 });

      const result = await setZwaveUser(hass, ENTITY_ID, {
        user_id: 5,
        user_name: "Bob",
        user_type: "general",
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_user",
        { user_id: 5, user_name: "Bob", user_type: "general" },
        { entity_id: ENTITY_ID },
        false,
        true
      );
      expect(result.user_id).toBe(5);
    });

    it("returns the allocated user_id when auto-finding", async () => {
      const hass = setUserResponse({ user_id: 1 });

      const result = await setZwaveUser(hass, ENTITY_ID, {
        user_name: "Carol",
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_user",
        { user_name: "Carol" },
        { entity_id: ENTITY_ID },
        false,
        true
      );
      expect(result.user_id).toBe(1);
    });
  });

  describe("clearZwaveUser", () => {
    it("calls the correct service with user_id and entity_id target", async () => {
      const hass = mockHass();

      await clearZwaveUser(hass, ENTITY_ID, 2);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "clear_user",
        { user_id: 2 },
        { entity_id: ENTITY_ID },
        false
      );
    });
  });

  describe("clearZwaveAllUsers", () => {
    it("calls clear_all_users with entity_id target and no params", async () => {
      const hass = mockHass();

      await clearZwaveAllUsers(hass, ENTITY_ID);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "clear_all_users",
        {},
        { entity_id: ENTITY_ID },
        false
      );
    });
  });

  describe("setZwaveCredential", () => {
    const setCredResponse = (inner: unknown) =>
      ({
        callService: vi
          .fn()
          .mockResolvedValue({ response: { [ENTITY_ID]: inner } }),
      }) as unknown as HomeAssistant;

    it("unwraps the entity_id-keyed response", async () => {
      const credentialResult = {
        credential_slot: 1,
        user_id: 3,
      };
      const hass = setCredResponse(credentialResult);

      const result = await setZwaveCredential(hass, ENTITY_ID, {
        user_id: 3,
        credential_type: "pin_code",
        credential_data: "1234",
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_credential",
        {
          user_id: 3,
          credential_type: "pin_code",
          credential_data: "1234",
        },
        { entity_id: ENTITY_ID },
        false,
        true
      );
      expect(result).toEqual(credentialResult);
      expect(result.credential_slot).toBe(1);
      expect(result.user_id).toBe(3);
    });

    it("forwards explicit credential_slot when provided", async () => {
      const hass = setCredResponse({ credential_slot: 5, user_id: 3 });

      await setZwaveCredential(hass, ENTITY_ID, {
        user_id: 3,
        credential_type: "pin_code",
        credential_data: "1234",
        credential_slot: 5,
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_credential",
        {
          user_id: 3,
          credential_type: "pin_code",
          credential_data: "1234",
          credential_slot: 5,
        },
        { entity_id: ENTITY_ID },
        false,
        true
      );
    });

    it("propagates errors from callService", async () => {
      const hass = {
        callService: vi.fn().mockRejectedValue(new Error("Slot full")),
      } as unknown as HomeAssistant;

      await expect(
        setZwaveCredential(hass, ENTITY_ID, {
          user_id: 1,
          credential_type: "pin_code",
          credential_data: "1234",
        })
      ).rejects.toThrow("Slot full");
    });
  });

  describe("clearZwaveCredential", () => {
    it("calls the correct service with params and entity_id target", async () => {
      const hass = mockHass();

      await clearZwaveCredential(hass, ENTITY_ID, {
        user_id: 2,
        credential_type: "pin_code",
        credential_slot: 1,
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "clear_credential",
        { user_id: 2, credential_type: "pin_code", credential_slot: 1 },
        { entity_id: ENTITY_ID },
        false
      );
    });
  });

  describe("clearZwaveAllCredentials", () => {
    it("calls clear_all_credentials with user_id and entity_id target", async () => {
      const hass = mockHass();

      await clearZwaveAllCredentials(hass, ENTITY_ID, 3);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "clear_all_credentials",
        { user_id: 3 },
        { entity_id: ENTITY_ID },
        false
      );
    });
  });
});
