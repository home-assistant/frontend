import * as CBOR from "cbor-js";

/**
 * WebAuthnError types.
 */
enum ErrorType {
  UNSUPPORTED = "unsupported",
  PROTOCOL = "protocol",
  DOMAIN = "domain",
  CREDENTIALS = "credentials",
  CANCELLED = "cancelled",
}

/**
 * Custom exception class.
 */
export class WebAuthnError extends Error {
  public type: ErrorType;

  constructor(type: ErrorType, message?: string) {
    super(message || type);

    this.name = "WebAuthnError";
    this.type = type;
  }
}

/**
 * Check browser supports WebAuthn.
 * @private
 */
function _checkBrowser() {
  // @ts-ignore
  if (!navigator.credentials) {
    throw new WebAuthnError(ErrorType.UNSUPPORTED);
  }
  // @ts-ignore
  if (!navigator.credentials.get || !navigator.credentials.create) {
    throw new WebAuthnError(ErrorType.UNSUPPORTED);
  }
  if (!ArrayBuffer || !Uint8Array || !Uint8Array.from) {
    throw new WebAuthnError(ErrorType.UNSUPPORTED);
  }
  if (location.protocol === "http:") {
    throw new WebAuthnError(ErrorType.PROTOCOL);
  }
}

/**
 * Handle credentials error.
 * @param {Error} e
 * @private
 */
function _handleCredentialsError(e) {
  if (e.name === "SecurityError") {
    throw new WebAuthnError(ErrorType.DOMAIN, e.message);
  } else if (e.code) {
    throw new WebAuthnError(ErrorType.CREDENTIALS, e.message);
  } else {
    throw new WebAuthnError(ErrorType.CANCELLED, e.message);
  }
}

/**
 * Register new token by WebAuthn.
 * @param {string} options
 */
export async function register(options) {
  _checkBrowser();

  // @ts-ignore
  const arr = Uint8Array.from(atob(options), (c) => c.charCodeAt(0));
  const data = CBOR.decode(arr.buffer);

  let attestation;
  try {
    // @ts-ignore
    attestation = await navigator.credentials.create(data);
  } catch (e) {
    _handleCredentialsError(e);
  }

  const encoded = CBOR.encode({
    attestationObject: new Uint8Array(attestation.response.attestationObject),
    clientDataJSON: new Uint8Array(attestation.response.clientDataJSON),
    rawId: new Uint8Array(attestation.rawId),
    type: attestation.type,
  });

  // @ts-ignore
  return btoa(String.fromCharCode(...new Uint8Array(encoded)));
}

/**
 * Authenticate token by WebAuthn.
 * @param {string} options
 */
export async function authenticate(options) {
  _checkBrowser();

  // @ts-ignore
  const arr = Uint8Array.from(atob(options), (c) => c.charCodeAt(0));
  const data = CBOR.decode(arr.buffer);

  let assertion;
  try {
    // @ts-ignore
    assertion = await navigator.credentials.get(data);
  } catch (e) {
    _handleCredentialsError(e);
  }

  const encoded = CBOR.encode({
    credentialId: new Uint8Array(assertion.rawId),
    authenticatorData: new Uint8Array(assertion.response.authenticatorData),
    clientDataJSON: new Uint8Array(assertion.response.clientDataJSON),
    signature: new Uint8Array(assertion.response.signature),
    type: assertion.type,
  });

  // @ts-ignore
  return btoa(String.fromCharCode(...new Uint8Array(encoded)));
}
