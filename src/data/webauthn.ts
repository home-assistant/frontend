import type { HaFormSchema } from "../components/ha-form/types";

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

export interface PublicKeyCredentialCreationOptionsJSON {
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

export interface PublicKeyCredentialUserEntityJSON {
  id: string;
  name: string;
  displayName: string;
}

export interface PublicKeyCredentialDescriptorJSON {
  type: PublicKeyCredentialType;
  id: string;
  transports?: AuthenticatorTransport[];
}

export interface PublicKeyCredentialCreationOptions {
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

export interface PublicKeyCredentialRequestOptionsJSON {
  id: string;
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials: PublicKeyCredentialDescriptorJSON[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

export interface PublicKeyCredentialRequestOptions {
  id: string;
  challenge: BufferSource;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

export interface PublicKeyCredentialRpEntity {
  id: string;
  name: string;
}

export interface PublicKeyCredentialUserEntity {
  id: BufferSource;
  name: string;
  displayName: string;
}

export interface PublicKeyCredentialParameters {
  type: PublicKeyCredentialType;
  alg: COSEAlgorithmIdentifier;
}

export type PublicKeyCredentialType = "public-key";

export type COSEAlgorithmIdentifier = -7 | -257 | -65535 | -257 | -65535;

export interface PublicKeyCredentialDescriptor {
  type: PublicKeyCredentialType;
  id: BufferSource;
  transports?: AuthenticatorTransport[];
}

export type AuthenticatorTransport = "usb" | "nfc" | "ble" | "internal";

export type AuthenticatorAttachment = "platform" | "cross-platform";

export type UserVerificationRequirement =
  | "required"
  | "preferred"
  | "discouraged";

export interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: AuthenticatorAttachment;
  requireResidentKey?: boolean;
  userVerification?: UserVerificationRequirement;
}

export type AttestationConveyancePreference = "none" | "indirect" | "direct";

export interface AuthenticationExtensionsClientInputs {
  [key: string]: any;
}

export interface PublicKeyCredentialWithClientExtensionOutputs {
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
}

export interface AuthenticationExtensionsClientOutputs {
  [key: string]: any;
}

export interface PublicKeyCredentialAttestationResponse {
  clientDataJSON: BufferSource;
  attestationObject: BufferSource;
}

export interface PublicKeyCredentialAssertionResponse {
  clientDataJSON: BufferSource;
  authenticatorData: BufferSource;
  signature: BufferSource;
  userHandle: BufferSource;
}

export interface PublicKeyRegistartionCredentialResponseJSON {
  authenticatorAttachment: string;
  id: string;
  rawId: string;
  response: PublicKeyCredentialAttestationResponseJSON;
  type: string;
}

export interface PublicKeyCredentialAttestationResponseJSON {
  clientDataJSON: string;
  attestationObject: string;
}

export interface PublicKeyRegistartionCredentialResponse {
  authenticatorAttachment: string;
  id: string;
  rawId: BufferSource;
  response: PublicKeyCredentialAttestationResponse;
  type: string;
}

export interface AuthenticationCredentialJSON {
  authenticatorAttachment: string;
  id: string;
  rawId: string;
  response: PublicKeyCredentialAssertionResponseJSON;
  type: string;
}

export interface PublicKeyCredentialAssertionResponseJSON {
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle: string;
}

export interface AuthenticationCredential {
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
