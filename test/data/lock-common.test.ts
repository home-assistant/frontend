import { describe, it, expect } from "vitest";
import {
  ENTERABLE_CREDENTIAL_TYPES,
  MATTER_CREDENTIAL_TYPE_MAP,
  getCredentialTypeIcon,
} from "../../src/data/lock-common";

describe("lock-common", () => {
  describe("ENTERABLE_CREDENTIAL_TYPES", () => {
    it("includes pin_code and password", () => {
      expect(ENTERABLE_CREDENTIAL_TYPES).toContain("pin_code");
      expect(ENTERABLE_CREDENTIAL_TYPES).toContain("password");
    });

    it("has exactly 2 entries", () => {
      expect(ENTERABLE_CREDENTIAL_TYPES).toHaveLength(2);
    });
  });

  describe("MATTER_CREDENTIAL_TYPE_MAP", () => {
    it("maps Matter credential types to canonical Z-Wave types", () => {
      expect(MATTER_CREDENTIAL_TYPE_MAP.pin).toBe("pin_code");
      expect(MATTER_CREDENTIAL_TYPE_MAP.rfid).toBe("rfid_code");
      expect(MATTER_CREDENTIAL_TYPE_MAP.fingerprint).toBe("finger_biometric");
      expect(MATTER_CREDENTIAL_TYPE_MAP.finger_vein).toBe("finger_vein");
      expect(MATTER_CREDENTIAL_TYPE_MAP.face).toBe("face_biometric");
    });
  });

  describe("getCredentialTypeIcon", () => {
    it("returns a non-empty string for known credential types", () => {
      const knownTypes = [
        "pin_code",
        "password",
        "rfid_code",
        "finger_biometric",
        "finger_vein",
        "face_biometric",
        "eye_biometric",
        "hand_biometric",
        "ble",
        "nfc",
        "desfire",
      ];
      for (const type of knownTypes) {
        const icon = getCredentialTypeIcon(type);
        expect(icon).toBeTruthy();
        expect(typeof icon).toBe("string");
      }
    });

    it("returns different icons for different types", () => {
      const pinIcon = getCredentialTypeIcon("pin_code");
      const passwordIcon = getCredentialTypeIcon("password");
      const rfidIcon = getCredentialTypeIcon("rfid_code");
      const fingerprintIcon = getCredentialTypeIcon("finger_biometric");
      const nfcIcon = getCredentialTypeIcon("nfc");

      // All should be distinct
      const icons = new Set([
        pinIcon,
        passwordIcon,
        rfidIcon,
        fingerprintIcon,
        nfcIcon,
      ]);
      expect(icons.size).toBe(5);
    });

    it("returns the same icon for finger_biometric and finger_vein", () => {
      expect(getCredentialTypeIcon("finger_biometric")).toBe(
        getCredentialTypeIcon("finger_vein")
      );
    });

    it("returns a fallback icon for unknown types", () => {
      const icon = getCredentialTypeIcon("unknown_type");
      expect(icon).toBeTruthy();
      expect(typeof icon).toBe("string");
    });
  });
});
