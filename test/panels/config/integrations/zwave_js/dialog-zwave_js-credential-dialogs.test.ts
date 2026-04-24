import { describe, it, expect } from "vitest";
import type {
  ZwaveCredentialCapabilities,
  ZwaveCredentialTypeCapability,
} from "../../../../../src/data/zwave_js-credentials";

/**
 * These tests mirror the pure branching logic embedded in the credential
 * dialogs, to guard against regressions in:
 *   - credential input validation (required / length / PIN digits)
 *   - enterable-credential-type gating
 *   - user-type filtering against lock capabilities
 *
 * The logic below is kept in sync with dialog-zwave_js-credential-edit.ts
 * and dialog-zwave_js-credential-user-edit.ts.
 */

const ENTERABLE_ZWAVE_CREDENTIAL_TYPES = ["pin_code", "password"] as const;
const SIMPLE_USER_TYPES = ["general", "disposable"] as const;

function credentialError(
  data: string,
  type: string,
  capability: ZwaveCredentialTypeCapability | undefined
): "required" | "length" | "pin_digits_only" | "" {
  if (!data) {
    return "required";
  }
  const minLength = capability?.min_length ?? 4;
  const maxLength = capability?.max_length ?? 10;
  if (data.length < minLength || data.length > maxLength) {
    return "length";
  }
  if (type === "pin_code" && !/^\d+$/.test(data)) {
    return "pin_digits_only";
  }
  return "";
}

function enterableTypes(capabilities: ZwaveCredentialCapabilities): string[] {
  if (!capabilities.supported_credential_types) {
    return [];
  }
  return ENTERABLE_ZWAVE_CREDENTIAL_TYPES.filter(
    (type) => type in capabilities.supported_credential_types
  );
}

function selectableUserTypes(
  capabilities: ZwaveCredentialCapabilities
): string[] {
  const supported = capabilities.supported_user_types ?? [];
  return SIMPLE_USER_TYPES.filter((t) => supported.includes(t));
}

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

describe("credential input validation", () => {
  it("requires a value", () => {
    expect(credentialError("", "pin_code", pinCapability)).toBe("required");
  });

  it("rejects values shorter than min_length", () => {
    expect(credentialError("123", "pin_code", pinCapability)).toBe("length");
  });

  it("rejects values longer than max_length", () => {
    expect(credentialError("123456789", "pin_code", pinCapability)).toBe(
      "length"
    );
  });

  it("rejects non-digit characters for pin_code", () => {
    expect(credentialError("12a4", "pin_code", pinCapability)).toBe(
      "pin_digits_only"
    );
  });

  it("accepts digits-only pin_code within bounds", () => {
    expect(credentialError("1234", "pin_code", pinCapability)).toBe("");
  });

  it("accepts alphanumeric password within bounds", () => {
    expect(credentialError("secret123", "password", passwordCapability)).toBe(
      ""
    );
  });

  it("falls back to 4-10 when capability is missing", () => {
    expect(credentialError("12", "pin_code", undefined)).toBe("length");
    expect(credentialError("1234", "pin_code", undefined)).toBe("");
    expect(credentialError("12345678901", "pin_code", undefined)).toBe(
      "length"
    );
  });
});

describe("enterable credential type gating", () => {
  it("returns pin_code and password when both supported", () => {
    expect(enterableTypes(buildCapabilities())).toEqual([
      "pin_code",
      "password",
    ]);
  });

  it("returns only pin_code when password is unsupported", () => {
    expect(
      enterableTypes(
        buildCapabilities({
          supported_credential_types: { pin_code: pinCapability },
        })
      )
    ).toEqual(["pin_code"]);
  });

  it("returns empty list when no enterable types are supported", () => {
    expect(
      enterableTypes(
        buildCapabilities({
          supported_credential_types: {
            finger_biometric: pinCapability,
          },
        })
      )
    ).toEqual([]);
  });
});

describe("selectable user types", () => {
  it("filters SIMPLE_USER_TYPES against capability-supported list", () => {
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

  it("excludes types absent from SIMPLE_USER_TYPES even if the lock lists them", () => {
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
