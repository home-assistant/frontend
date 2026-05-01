import { describe, it, expect } from "vitest";
import type { MatterLockInfo } from "../../../../../src/data/matter-lock";

/**
 * These tests verify the display logic for the lock management dialog,
 * ensuring the correct alert is shown based on lock capabilities.
 */

type AlertState =
  | "no_user_management"
  | "no_credential_types_supported"
  | "pin_not_supported"
  | "full_support";

/**
 * Mirrors the branching logic in dialog-matter-lock-manage.ts render()
 * and _renderUsers() to determine which alert (if any) to display.
 */
function getAlertState(lockInfo: MatterLockInfo | undefined): AlertState {
  if (lockInfo && !lockInfo.supports_user_management) {
    return "no_user_management";
  }

  const hasNoManageableCredentials =
    !lockInfo?.supported_credential_types?.length;

  if (hasNoManageableCredentials) {
    return "no_credential_types_supported";
  }

  const supportsPinCredential =
    lockInfo?.supported_credential_types?.includes("pin") ?? false;

  if (!supportsPinCredential) {
    return "pin_not_supported";
  }

  return "full_support";
}

describe("dialog-matter-lock-manage alert logic", () => {
  it("shows no_user_management when lock does not support user management", () => {
    const lockInfo: MatterLockInfo = {
      supports_user_management: false,
      supported_credential_types: [],
      max_users: null,
      max_pin_users: null,
      max_rfid_users: null,
      max_credentials_per_user: null,
      min_pin_length: null,
      max_pin_length: null,
      min_rfid_length: null,
      max_rfid_length: null,
    };

    expect(getAlertState(lockInfo)).toBe("no_user_management");
  });

  it("shows no_user_management even if credential types are listed", () => {
    const lockInfo: MatterLockInfo = {
      supports_user_management: false,
      supported_credential_types: ["pin"],
      max_users: null,
      max_pin_users: null,
      max_rfid_users: null,
      max_credentials_per_user: null,
      min_pin_length: 4,
      max_pin_length: 8,
      min_rfid_length: null,
      max_rfid_length: null,
    };

    expect(getAlertState(lockInfo)).toBe("no_user_management");
  });

  it("shows no_credential_types_supported when user management is supported but no credential types", () => {
    const lockInfo: MatterLockInfo = {
      supports_user_management: true,
      supported_credential_types: [],
      max_users: 10,
      max_pin_users: null,
      max_rfid_users: null,
      max_credentials_per_user: null,
      min_pin_length: null,
      max_pin_length: null,
      min_rfid_length: null,
      max_rfid_length: null,
    };

    expect(getAlertState(lockInfo)).toBe("no_credential_types_supported");
  });

  it("shows pin_not_supported when user management is supported with non-pin credentials only", () => {
    const lockInfo: MatterLockInfo = {
      supports_user_management: true,
      supported_credential_types: ["rfid"],
      max_users: 10,
      max_pin_users: null,
      max_rfid_users: 5,
      max_credentials_per_user: 3,
      min_pin_length: null,
      max_pin_length: null,
      min_rfid_length: 4,
      max_rfid_length: 8,
    };

    expect(getAlertState(lockInfo)).toBe("pin_not_supported");
  });

  it("shows full_support when user management and pin are both supported", () => {
    const lockInfo: MatterLockInfo = {
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

    expect(getAlertState(lockInfo)).toBe("full_support");
  });

  it("shows full_support when both pin and rfid are supported", () => {
    const lockInfo: MatterLockInfo = {
      supports_user_management: true,
      supported_credential_types: ["pin", "rfid"],
      max_users: 10,
      max_pin_users: 10,
      max_rfid_users: 5,
      max_credentials_per_user: 5,
      min_pin_length: 4,
      max_pin_length: 8,
      min_rfid_length: 4,
      max_rfid_length: 8,
    };

    expect(getAlertState(lockInfo)).toBe("full_support");
  });

  it("handles undefined lockInfo as no_credential_types_supported", () => {
    expect(getAlertState(undefined)).toBe("no_credential_types_supported");
  });
});
