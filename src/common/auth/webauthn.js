import * as CBOR from "cbor-js";

/**
 * Custom exception class.
 */
export class WebAuthnError extends Error {
  /**
   * @constructor
   * @param {string} type
   * @param {string=} message
   */
  constructor(type, message) {
    super(message || type);

    this.name = "WebAuthnError";
    this.type = type;
  }
}

WebAuthnError.UNSUPPORTED = "unsupported";
WebAuthnError.PROTOCOL = "protocol";
WebAuthnError.DOMAIN = "domain";
WebAuthnError.CREDENTIALS = "credentials";
WebAuthnError.CANCELLED = "cancelled";

/**
 * Check browser supports WebAuthn.
 * @private
 */
function _checkBrowser() {
  if (!navigator.credentials) {
    throw new WebAuthnError(WebAuthnError.UNSUPPORTED);
  }
  if (!navigator.credentials.get || !navigator.credentials.create) {
    throw new WebAuthnError(WebAuthnError.UNSUPPORTED);
  }
  if (!ArrayBuffer || !Uint8Array || !Uint8Array.from) {
    throw new WebAuthnError(WebAuthnError.UNSUPPORTED);
  }
  if (location.protocol === "http:") {
    throw new WebAuthnError(WebAuthnError.PROTOCOL);
  }
}

/**
 * Handle credentials error.
 * @param {Error} e
 * @private
 */
function _handleCredentialsError(e) {
  if (e.name === "SecurityError") {
    throw new WebAuthnError(WebAuthnError.DOMAIN, e.message);
  } else if (e.code) {
    throw new WebAuthnError(WebAuthnError.CREDENTIALS, e.message);
  } else {
    throw new WebAuthnError(WebAuthnError.CANCELLED, e.message);
  }
}

/**
 * Register new token by WebAuthn.
 * @param {Object} options
 * @return {string}
 */
export async function register(options) {
  _checkBrowser();

  const arr = Uint8Array.from(atob(options), (c) => c.charCodeAt(0));
  const data = CBOR.decode(arr.buffer);

  let attestation;
  try {
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

  return btoa(String.fromCharCode(...new Uint8Array(encoded)));
}

/**
 * Authenticate token by WebAuthn.
 * @param {Object} options
 * @return {string}
 */
export async function authenticate(options) {
  _checkBrowser();

  const arr = Uint8Array.from(atob(options), (c) => c.charCodeAt(0));
  const data = CBOR.decode(arr.buffer);

  let assertion;
  try {
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

  return btoa(String.fromCharCode(...new Uint8Array(encoded)));
}
