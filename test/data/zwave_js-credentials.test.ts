import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getZwaveCredentialCapabilities,
  getZwaveUsers,
  setZwaveUser,
  clearZwaveUser,
  setZwaveCredential,
  clearZwaveCredential,
} from "../../src/data/zwave_js-credentials";
import type { HomeAssistant } from "../../src/types";

const DEVICE_ID = "abc123_zwave_device";

const mockHass = (response?: unknown) =>
  ({
    callService: vi
      .fn()
      .mockResolvedValue(
        response !== undefined
          ? { response: { [DEVICE_ID]: response } }
          : { response: undefined }
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
        true,
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
        true,
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
    it("calls the correct service with params and device_id target", async () => {
      const hass = mockHass();

      await setZwaveUser(hass, DEVICE_ID, {
        user_index: 1,
        user_name: "Bob",
        user_type: "general",
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_user",
        { user_index: 1, user_name: "Bob", user_type: "general" },
        { device_id: DEVICE_ID }
      );
    });

    it("can be called with partial params", async () => {
      const hass = mockHass();

      await setZwaveUser(hass, DEVICE_ID, { user_name: "Carol" });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_user",
        { user_name: "Carol" },
        { device_id: DEVICE_ID }
      );
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
        { device_id: DEVICE_ID }
      );
    });
  });

  describe("setZwaveCredential", () => {
    it("calls the correct service and returns the response", async () => {
      const credentialResult = {
        credential_slot: 1,
        user_index: 3,
      };
      const hass = mockHass(credentialResult);

      const result = await setZwaveCredential(hass, DEVICE_ID, {
        credential_type: "pin_code",
        credential_data: "1234",
        user_type: "general",
        active: true,
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "set_credential",
        {
          credential_type: "pin_code",
          credential_data: "1234",
          user_type: "general",
          active: true,
        },
        { device_id: DEVICE_ID },
        true,
        true
      );
      expect(result).toEqual(credentialResult);
      expect(result.credential_slot).toBe(1);
      expect(result.user_index).toBe(3);
    });

    it("propagates errors from callService", async () => {
      const hass = {
        callService: vi.fn().mockRejectedValue(new Error("Slot full")),
      } as unknown as HomeAssistant;

      await expect(
        setZwaveCredential(hass, DEVICE_ID, {
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
        credential_type: "pin_code",
        credential_slot: 1,
        user_index: 2,
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "zwave_js",
        "clear_credential",
        { credential_type: "pin_code", credential_slot: 1, user_index: 2 },
        { device_id: DEVICE_ID }
      );
    });
  });
});
