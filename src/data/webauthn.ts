import type { HaFormSchema } from "../components/ha-form/types";
import type { HomeAssistant } from "../types";

declare global {
  interface HASSDomEvents {
    "hass-refresh-passkeys": undefined;
  }
}

export interface Passkey {
  id: string;
  credential_id: string;
  name: string;
  created_at: string;
  last_used_at?: string;
}

interface PublicKeyCredentialCreationOptionsJSON {
  rp: PublicKeyCredentialRpEntity;
  user: PublicKeyCredentialUserEntityJSON;
  challenge: string;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials: PublicKeyCredentialDescriptorJSON[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
}

interface PublicKeyCredentialUserEntityJSON {
  id: string;
  name: string;
  displayName: string;
}

interface PublicKeyCredentialDescriptorJSON {
  type: PublicKeyCredentialType;
  id: string;
  transports?: AuthenticatorTransport[];
}

interface PublicKeyCredentialCreationOptions {
  rp: PublicKeyCredentialRpEntity;
  user: PublicKeyCredentialUserEntity;
  challenge: BufferSource;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
}

interface PublicKeyCredentialRequestOptionsJSON {
  id: string;
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials: PublicKeyCredentialDescriptorJSON[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

interface PublicKeyCredentialRequestOptions {
  id: string;
  challenge: BufferSource;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

interface PublicKeyCredentialRpEntity {
  id: string;
  name: string;
}

interface PublicKeyCredentialUserEntity {
  id: BufferSource;
  name: string;
  displayName: string;
}

interface PublicKeyCredentialParameters {
  type: PublicKeyCredentialType;
  alg: COSEAlgorithmIdentifier;
}

type PublicKeyCredentialType = "public-key";

type COSEAlgorithmIdentifier = -7 | -257 | -65535 | -257 | -65535;

interface PublicKeyCredentialDescriptor {
  type: PublicKeyCredentialType;
  id: BufferSource;
  transports?: AuthenticatorTransport[];
}

type AuthenticatorTransport = "usb" | "nfc" | "ble" | "internal";

type AuthenticatorAttachment = "platform" | "cross-platform";

type UserVerificationRequirement = "required" | "preferred" | "discouraged";

interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: AuthenticatorAttachment;
  requireResidentKey?: boolean;
  userVerification?: UserVerificationRequirement;
}

type AttestationConveyancePreference = "none" | "indirect" | "direct";

interface AuthenticationExtensionsClientInputs {
  [key: string]: any;
}

interface PublicKeyCredentialAttestationResponse {
  clientDataJSON: BufferSource;
  attestationObject: BufferSource;
}

interface PublicKeyCredentialAssertionResponse {
  clientDataJSON: BufferSource;
  authenticatorData: BufferSource;
  signature: BufferSource;
  userHandle: BufferSource;
}

interface PublicKeyRegistartionCredentialResponseJSON {
  authenticatorAttachment: string;
  id: string;
  rawId: string;
  response: PublicKeyCredentialAttestationResponseJSON;
  type: string;
}

interface PublicKeyCredentialAttestationResponseJSON {
  clientDataJSON: string;
  attestationObject: string;
}

interface PublicKeyRegistartionCredentialResponse {
  authenticatorAttachment: string;
  id: string;
  rawId: BufferSource;
  response: PublicKeyCredentialAttestationResponse;
  type: string;
}

interface AuthenticationCredentialJSON {
  authenticatorAttachment: string;
  id: string;
  rawId: string;
  response: PublicKeyCredentialAssertionResponseJSON;
  type: string;
}

interface PublicKeyCredentialAssertionResponseJSON {
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle: string;
}

interface AuthenticationCredential {
  authenticatorAttachment: string;
  id: string;
  rawId: BufferSource;
  response: PublicKeyCredentialAssertionResponse;
  type: string;
}

export interface DataEntryFlowStepChallengeForm {
  type: "form";
  flow_id: string;
  handler: string;
  step_id: string;
  data_schema: HaFormSchema[];
  errors: Record<string, string>;
  description_placeholders?: Record<string, any>;
  last_step: boolean | null;
  preview?: string;
  translation_domain?: string;
}

export const base64url = {
  encode: function (buffer) {
    const base64 = window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  },
  decode: function (_base64url) {
    const base64 = _base64url.replace(/-/g, "+").replace(/_/g, "/");
    const binStr = window.atob(base64);
    const bin = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bin[i] = binStr.charCodeAt(i);
    }
    return bin.buffer;
  },
};

const _generateRegistrationCredentialsJSON = async (
  registrationOptions: PublicKeyCredentialCreationOptions
) => {
  const result = await navigator.credentials.create({
    publicKey: registrationOptions,
  });

  const publicKeyCredential = result as PublicKeyRegistartionCredentialResponse;
  const credentials: PublicKeyRegistartionCredentialResponseJSON = {
    id: publicKeyCredential.id,
    authenticatorAttachment: publicKeyCredential.authenticatorAttachment,
    type: publicKeyCredential.type,
    rawId: base64url.encode(publicKeyCredential.rawId),
    response: {
      clientDataJSON: base64url.encode(
        publicKeyCredential.response.clientDataJSON
      ),
      attestationObject: base64url.encode(
        publicKeyCredential.response.attestationObject
      ),
    },
  };
  return credentials;
};

const _generateAuthenticationCredentialsJSON = async (
  authCredentials: AuthenticationCredential
) => {
  const authenticationCredentialJSON: AuthenticationCredentialJSON = {
    id: authCredentials.id,
    authenticatorAttachment: authCredentials.authenticatorAttachment,
    rawId: base64url.encode(authCredentials.rawId),
    response: {
      userHandle: base64url.encode(authCredentials.response.userHandle),
      clientDataJSON: base64url.encode(authCredentials.response.clientDataJSON),
      authenticatorData: base64url.encode(
        authCredentials.response.authenticatorData
      ),
      signature: base64url.encode(authCredentials.response.signature),
    },
    type: authCredentials.type,
  };
  return authenticationCredentialJSON;
};

const _verifyRegistration = async (
  hass: HomeAssistant,
  credentials: PublicKeyRegistartionCredentialResponseJSON
) => {
  await hass.callWS({
    type: "config/auth_provider/passkey/register_verify",
    credential: credentials,
  });
};

export const registerPasskey = async (hass: HomeAssistant) => {
  const registrationOptions: PublicKeyCredentialCreationOptionsJSON =
    await hass.callWS({
      type: "config/auth_provider/passkey/register",
    });
  const options: PublicKeyCredentialCreationOptions = {
    ...registrationOptions,
    user: {
      ...registrationOptions.user,
      id: base64url.decode(registrationOptions.user.id),
    },
    challenge: base64url.decode(registrationOptions.challenge),
    excludeCredentials: registrationOptions.excludeCredentials.map((cred) => ({
      ...cred,
      id: base64url.decode(cred.id),
    })),
  };

  const credentials = await _generateRegistrationCredentialsJSON(options);
  await _verifyRegistration(hass, credentials);
};

export const deletePasskey = async (
  hass: HomeAssistant,
  credential_id: string
) => {
  await hass.callWS({
    type: "config/auth_provider/passkey/delete",
    credential_id,
  });
};

export const renamePasskey = async (
  hass: HomeAssistant,
  credential_id: string,
  name: string
) => {
  await hass.callWS({
    type: "config/auth_provider/passkey/rename",
    credential_id,
    name,
  });
};

export const generateAuthenticationCredentialsJSON = async (
  publicKeyOptions: PublicKeyCredentialRequestOptionsJSON
) => {
  const _publicKeyOptions: PublicKeyCredentialRequestOptions = {
    ...publicKeyOptions,
    challenge: base64url.decode(publicKeyOptions.challenge),
    allowCredentials: publicKeyOptions.allowCredentials.map((cred) => ({
      ...cred,
      id: base64url.decode(cred.id),
    })),
  };

  const result = await navigator.credentials.get({
    publicKey: _publicKeyOptions,
  });
  const authenticationCredential = result as AuthenticationCredential;
  const authenticationCredentialJSON =
    await _generateAuthenticationCredentialsJSON(authenticationCredential);
  return authenticationCredentialJSON;
};
