import {
  mdiBluetooth,
  mdiCreditCardChip,
  mdiDialpad,
  mdiEye,
  mdiFaceRecognition,
  mdiFingerprint,
  mdiFormTextboxPassword,
  mdiHandBackRight,
  mdiKey,
  mdiNfc,
} from "@mdi/js";

/**
 * Credential types that the UI can create — the user enters text data.
 * PIN codes are numeric-only; passwords allow UTF-16 text.
 */
export const ENTERABLE_CREDENTIAL_TYPES = ["pin_code", "password"] as const;

/**
 * Maps Matter credential type strings to canonical (Z-Wave) naming.
 */
export const MATTER_CREDENTIAL_TYPE_MAP: Record<string, string> = {
  pin: "pin_code",
  rfid: "rfid_code",
  fingerprint: "finger_biometric",
  finger_vein: "finger_vein",
  face: "face_biometric",
};

/**
 * Returns an MDI icon path for a given canonical credential type string.
 */
export const getCredentialTypeIcon = (type: string): string => {
  switch (type) {
    case "pin_code":
      return mdiDialpad;
    case "password":
      return mdiFormTextboxPassword;
    case "rfid_code":
      return mdiCreditCardChip;
    case "finger_biometric":
    case "finger_vein":
      return mdiFingerprint;
    case "face_biometric":
      return mdiFaceRecognition;
    case "eye_biometric":
      return mdiEye;
    case "hand_biometric":
      return mdiHandBackRight;
    case "ble":
      return mdiBluetooth;
    case "nfc":
      return mdiNfc;
    default:
      return mdiKey;
  }
};
