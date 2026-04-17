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
  getZwaveCredentialStatus,
} from "../../src/data/zwave_js-credentials";
import type { HomeAssistant } from "../../src/types";

const DEVICE_ID = "abc123_zwave_device";

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
    it("calls the correct service with device_id target and returnResponse", async () => {
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
      const hass = mockHass(capabilities);

      const result = await getZwaveCredentialCapabilities(hass, DEVICE_ID);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "get_credential_capabilities",
        {},
        { device_id: DEVICE_ID },
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
        getZwaveCredentialCapabilities(hass, DEVICE_ID)
      ).rejects.toThrow("Service unavailable");
    });
  });

  describe("getZwaveUsers", () => {
    it("calls the correct service with device_id target and returnResponse", async () => {
      const usersResponse = {
        max_users: 20,
        users: [
          {
            user_index: 1,
            user_name: "Alice",
            active: true,
            user_type: "general",
            credential_rule: "single",
            credentials: [
              { type: "pin_code", slot: 1 },
              { type: "finger_biometric", slot: 1 },
            ],
          },
        ],
      };
      const hass = mockHass(usersResponse);

      const result = await getZwaveUsers(hass, DEVICE_ID);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "get_users",
        {},
        { device_id: DEVICE_ID },
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

      await expect(getZwaveUsers(hass, DEVICE_ID)).rejects.toThrow(
        "Not supported"
      );
    });
  });

  describe("setZwaveUser", () => {
    const setUserResponse = (inner: unknown) =>
      ({
        callService: vi
          .fn()
          .mockResolvedValue({ response: { [DEVICE_ID]: inner } }),
      }) as unknown as HomeAssistant;

    it("unwraps the device_id-keyed response and returns user_index", async () => {
      const hass = setUserResponse({ user_index: 5 });

      const result = await setZwaveUser(hass, DEVICE_ID, {
        user_index: 5,
        user_name: "Bob",
        user_type: "general",
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_user",
        { user_index: 5, user_name: "Bob", user_type: "general" },
        { device_id: DEVICE_ID },
        false,
        true
      );
      expect(result.user_index).toBe(5);
    });

    it("returns the allocated user_index when auto-finding", async () => {
      const hass = setUserResponse({ user_index: 1 });

      const result = await setZwaveUser(hass, DEVICE_ID, {
        user_name: "Carol",
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_user",
        { user_name: "Carol" },
        { device_id: DEVICE_ID },
        false,
        true
      );
      expect(result.user_index).toBe(1);
    });
  });

  describe("clearZwaveUser", () => {
    it("calls the correct service with user_index and device_id target", async () => {
      const hass = mockHass();

      await clearZwaveUser(hass, DEVICE_ID, 2);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "clear_user",
        { user_index: 2 },
        { device_id: DEVICE_ID },
        false
      );
    });
  });

  describe("clearZwaveAllUsers", () => {
    it("calls clear_all_users with device_id target and no params", async () => {
      const hass = mockHass();

      await clearZwaveAllUsers(hass, DEVICE_ID);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "clear_all_users",
        {},
        { device_id: DEVICE_ID },
        false
      );
    });
  });

  describe("setZwaveCredential", () => {
    const setCredResponse = (inner: unknown) =>
      ({
        callService: vi
          .fn()
          .mockResolvedValue({ response: { [DEVICE_ID]: inner } }),
      }) as unknown as HomeAssistant;

    it("unwraps the device_id-keyed response", async () => {
      const credentialResult = {
        credential_slot: 1,
        user_index: 3,
      };
      const hass = setCredResponse(credentialResult);

      const result = await setZwaveCredential(hass, DEVICE_ID, {
        user_index: 3,
        credential_type: "pin_code",
        credential_data: "1234",
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_credential",
        {
          user_index: 3,
          credential_type: "pin_code",
          credential_data: "1234",
        },
        { device_id: DEVICE_ID },
        false,
        true
      );
      expect(result).toEqual(credentialResult);
      expect(result.credential_slot).toBe(1);
      expect(result.user_index).toBe(3);
    });

    it("forwards explicit credential_slot when provided", async () => {
      const hass = setCredResponse({ credential_slot: 5, user_index: 3 });

      await setZwaveCredential(hass, DEVICE_ID, {
        user_index: 3,
        credential_type: "pin_code",
        credential_data: "1234",
        credential_slot: 5,
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_credential",
        {
          user_index: 3,
          credential_type: "pin_code",
          credential_data: "1234",
          credential_slot: 5,
        },
        { device_id: DEVICE_ID },
        false,
        true
      );
    });

    it("propagates errors from callService", async () => {
      const hass = {
        callService: vi.fn().mockRejectedValue(new Error("Slot full")),
      } as unknown as HomeAssistant;

      await expect(
        setZwaveCredential(hass, DEVICE_ID, {
          user_index: 1,
          credential_type: "pin_code",
          credential_data: "1234",
        })
      ).rejects.toThrow("Slot full");
    });
  });

  describe("clearZwaveCredential", () => {
    it("calls the correct service with params and device_id target", async () => {
      const hass = mockHass();

      await clearZwaveCredential(hass, DEVICE_ID, {
        user_index: 2,
        credential_type: "pin_code",
        credential_slot: 1,
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "clear_credential",
        { user_index: 2, credential_type: "pin_code", credential_slot: 1 },
        { device_id: DEVICE_ID },
        false
      );
    });
  });

  describe("clearZwaveAllCredentials", () => {
    it("calls clear_all_credentials with user_index and device_id target", async () => {
      const hass = mockHass();

      await clearZwaveAllCredentials(hass, DEVICE_ID, 3);

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "clear_all_credentials",
        { user_index: 3 },
        { device_id: DEVICE_ID },
        false
      );
    });
  });

  describe("getZwaveCredentialStatus", () => {
    it("calls get_credential_status and returns the response", async () => {
      const statusResponse = {
        credential_exists: true,
        user_index: 1,
        credential_type: "pin_code",
        credential_slot: 1,
      };
      const hass = mockHass(statusResponse);

      const result = await getZwaveCredentialStatus(hass, DEVICE_ID, {
        user_index: 1,
        credential_type: "pin_code",
        credential_slot: 1,
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "get_credential_status",
        { user_index: 1, credential_type: "pin_code", credential_slot: 1 },
        { device_id: DEVICE_ID },
        false,
        true
      );
      expect(result).toEqual(statusResponse);
    });
  });
});
