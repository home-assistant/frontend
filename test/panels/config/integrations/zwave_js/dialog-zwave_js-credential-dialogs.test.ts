import { describe, it, expect } from "vitest";
import {
  canAddZwaveUser,
  enterableCredentialTypes,
  getCredentialError,
  selectableUserTypes,
} from "../../../../../src/data/zwave_js-credentials";
import type {
  ZwaveCredentialCapabilities,
  ZwaveCredentialTypeCapability,
} from "../../../../../src/data/zwave_js-credentials";

const pinCapability: ZwaveCredentialTypeCapability = {
  num_slots: 10,
  min_length: 4,
  max_length: 8,
  supports_learn: false,
};

const passwordCapability: ZwaveCredentialTypeCapability = {
  num_slots: 10,
  min_length: 6,
  max_length: 32,
  supports_learn: false,
};

const buildCapabilities = (
  overrides: Partial<ZwaveCredentialCapabilities> = {}
): ZwaveCredentialCapabilities => ({
  supports_user_management: true,
  max_users: 20,
  supported_user_types: ["general", "programming", "disposable"],
  max_user_name_length: 20,
  supported_credential_rules: ["single"],
  supported_credential_types: {
    pin_code: pinCapability,
    password: passwordCapability,
  },
  ...overrides,
});

describe("getCredentialError", () => {
  it("requires a value", () => {
    expect(getCredentialError("", "pin_code", pinCapability)).toBe("required");
  });

  it("rejects values shorter than min_length", () => {
    expect(getCredentialError("123", "pin_code", pinCapability)).toBe("length");
  });

  it("rejects values longer than max_length", () => {
    expect(getCredentialError("123456789", "pin_code", pinCapability)).toBe(
      "length"
    );
  });

  it("rejects non-digit characters for pin_code", () => {
    expect(getCredentialError("12a4", "pin_code", pinCapability)).toBe(
      "pin_digits_only"
    );
  });

  it("accepts digits-only pin_code within bounds", () => {
    expect(getCredentialError("1234", "pin_code", pinCapability)).toBe("");
  });

  it("accepts alphanumeric password within bounds", () => {
    expect(
      getCredentialError("secret123", "password", passwordCapability)
    ).toBe("");
  });

  it("falls back to 4-10 when capability is missing", () => {
    expect(getCredentialError("12", "pin_code", undefined)).toBe("length");
    expect(getCredentialError("1234", "pin_code", undefined)).toBe("");
    expect(getCredentialError("12345678901", "pin_code", undefined)).toBe(
      "length"
    );
  });
});

describe("enterableCredentialTypes", () => {
  it("returns pin_code and password when both supported", () => {
    expect(enterableCredentialTypes(buildCapabilities())).toEqual([
      "pin_code",
      "password",
    ]);
  });

  it("returns only pin_code when password is unsupported", () => {
    expect(
      enterableCredentialTypes(
        buildCapabilities({
          supported_credential_types: { pin_code: pinCapability },
        })
      )
    ).toEqual(["pin_code"]);
  });

  it("returns empty list when no enterable types are supported", () => {
    expect(
      enterableCredentialTypes(
        buildCapabilities({
          supported_credential_types: {
            finger_biometric: pinCapability,
          },
        })
      )
    ).toEqual([]);
  });
});

describe("selectableUserTypes", () => {
  it("filters simple user types against capability-supported list", () => {
    expect(
      selectableUserTypes(
        buildCapabilities({ supported_user_types: ["general", "disposable"] })
      )
    ).toEqual(["general", "disposable"]);
  });

  it("drops types the lock does not support", () => {
    expect(
      selectableUserTypes(
        buildCapabilities({ supported_user_types: ["general"] })
      )
    ).toEqual(["general"]);
  });

  it("excludes non-simple types even if the lock lists them", () => {
    expect(
      selectableUserTypes(
        buildCapabilities({
          supported_user_types: ["programming", "duress", "general"],
        })
      )
    ).toEqual(["general"]);
  });

  it("returns an empty list when no overlap exists", () => {
    expect(
      selectableUserTypes(
        buildCapabilities({ supported_user_types: ["programming"] })
      )
    ).toEqual([]);
  });
});

describe("canAddZwaveUser", () => {
  it("permits adding when both enterable types and simple user types are supported", () => {
    expect(canAddZwaveUser(buildCapabilities())).toBe(true);
  });

  it("blocks adding when no enterable credential types are supported", () => {
    expect(
      canAddZwaveUser(
        buildCapabilities({
          supported_credential_types: { finger_biometric: pinCapability },
        })
      )
    ).toBe(false);
  });

  it("blocks adding when no selectable user types are supported", () => {
    expect(
      canAddZwaveUser(
        buildCapabilities({ supported_user_types: ["programming"] })
      )
    ).toBe(false);
  });
});
