import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getMatterLockInfo,
  getMatterLockUsers,
  setMatterLockUser,
  clearMatterLockUser,
  setMatterLockCredential,
} from "../../src/data/matter-lock";
import type { HomeAssistant } from "../../src/types";

const ENTITY_ID = "lock.front_door";

// Entity services wrap responses in a dict keyed by entity_id
const mockHass = (response?: unknown) =>
  ({
    callService: vi
      .fn()
      .mockResolvedValue(
        response !== undefined
          ? { response: { [ENTITY_ID]: response } }
          : { response: undefined }
      ),
  }) as unknown as HomeAssistant;

describe("matter-lock", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getMatterLockInfo", () => {
    it("calls the correct service with entity_id target and returnResponse", async () => {
      const lockInfo = {
        supports_user_management: true,
        supported_credential_types: ["pin"],
        max_users: 10,
        max_pin_users: 10,
        max_rfid_users: null,
        max_credentials_per_user: 5,
        min_pin_length: 4,
        max_pin_length: 8,
        min_rfid_length: null,
        max_rfid_length: null,
      };
      const hass = mockHass(lockInfo);

      const result = await getMatterLockInfo(hass, ENTITY_ID);

      expect(hass.callService).toHaveBeenCalledWith(
        "matter",
        "get_lock_info",
        {},
        { entity_id: ENTITY_ID },
        true,
        true
      );
      expect(result).toEqual(lockInfo);
    });

    it("propagates errors from callService", async () => {
      const hass = {
        callService: vi
          .fn()
          .mockRejectedValue(new Error("Service unavailable")),
      } as unknown as HomeAssistant;

      await expect(getMatterLockInfo(hass, ENTITY_ID)).rejects.toThrow(
        "Service unavailable"
      );
    });
  });

  describe("getMatterLockUsers", () => {
    it("calls the correct service with entity_id target and returnResponse", async () => {
      const usersResponse = {
        max_users: 10,
        users: [
          {
            user_index: 1,
            user_name: "Alice",
            user_unique_id: 42,
            user_status: "occupied_enabled",
            user_type: "unrestricted_user",
            credential_rule: "single",
            credentials: [{ type: "pin", index: 1 }],
            next_user_index: 2,
          },
        ],
      };
      const hass = mockHass(usersResponse);

      const result = await getMatterLockUsers(hass, ENTITY_ID);

      expect(hass.callService).toHaveBeenCalledWith(
        "matter",
        "get_lock_users",
        {},
        { entity_id: ENTITY_ID },
        true,
        true
      );
      expect(result).toEqual(usersResponse);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].user_name).toBe("Alice");
    });

    it("propagates errors from callService", async () => {
      const hass = {
        callService: vi.fn().mockRejectedValue(new Error("Not a lock")),
      } as unknown as HomeAssistant;

      await expect(getMatterLockUsers(hass, ENTITY_ID)).rejects.toThrow(
        "Not a lock"
      );
    });
  });

  describe("setMatterLockUser", () => {
    it("calls the correct service with params and entity_id target", async () => {
      const hass = mockHass();

      await setMatterLockUser(hass, ENTITY_ID, {
        user_index: 1,
        user_name: "Bob",
        user_type: "unrestricted_user",
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "matter",
        "set_lock_user",
        { user_index: 1, user_name: "Bob", user_type: "unrestricted_user" },
        { entity_id: ENTITY_ID }
      );
    });

    it("can be called with partial params", async () => {
      const hass = mockHass();

      await setMatterLockUser(hass, ENTITY_ID, { user_name: "Carol" });

      expect(hass.callService).toHaveBeenCalledWith(
        "matter",
        "set_lock_user",
        { user_name: "Carol" },
        { entity_id: ENTITY_ID }
      );
    });
  });

  describe("clearMatterLockUser", () => {
    it("calls the correct service with user_index and entity_id target", async () => {
      const hass = mockHass();

      await clearMatterLockUser(hass, ENTITY_ID, 2);

      expect(hass.callService).toHaveBeenCalledWith(
        "matter",
        "clear_lock_user",
        { user_index: 2 },
        { entity_id: ENTITY_ID }
      );
    });
  });

  describe("setMatterLockCredential", () => {
    it("calls the correct service and returns the response", async () => {
      const credentialResult = {
        credential_index: 1,
        user_index: 3,
        next_credential_index: 2,
      };
      const hass = mockHass(credentialResult);

      const result = await setMatterLockCredential(hass, ENTITY_ID, {
        credential_type: "pin",
        credential_data: "1234",
        user_type: "unrestricted_user",
      });

      expect(hass.callService).toHaveBeenCalledWith(
        "matter",
        "set_lock_credential",
        {
          credential_type: "pin",
          credential_data: "1234",
          user_type: "unrestricted_user",
        },
        { entity_id: ENTITY_ID },
        true,
        true
      );
      expect(result).toEqual(credentialResult);
      expect(result.credential_index).toBe(1);
      expect(result.user_index).toBe(3);
    });

    it("propagates errors from callService", async () => {
      const hass = {
        callService: vi.fn().mockRejectedValue(new Error("Invalid PIN")),
      } as unknown as HomeAssistant;

      await expect(
        setMatterLockCredential(hass, ENTITY_ID, {
          credential_type: "pin",
          credential_data: "abc",
        })
      ).rejects.toThrow("Invalid PIN");
    });
  });
});
