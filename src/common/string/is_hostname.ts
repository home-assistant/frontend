// RFC 1123 hostname label: 1-63 chars, alphanumeric, with hyphens allowed
// only between the first and last character. The hyphen is escaped because a
// `pattern` attribute is compiled with the `v` flag, under which a trailing
// unescaped hyphen is an invalid character class — and a pattern that fails to
// compile is silently ignored, disabling validation altogether.
const LABEL = "[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?";

// Hostname such as "localhost" or "homeassistant.lan", as dot-separated
// labels. Unanchored, for use as an HTML `pattern` attribute (the browser
// anchors it as `^(?:…)$`). The final label may not be all digits, so a
// mistyped IP address like "300.1.1.1" is rejected rather than accepted as a
// hostname. Deliberately excludes underscores and a trailing dot.
export const HOSTNAME_PATTERN = `(?:${LABEL}\\.)*(?!\\d+$)${LABEL}`;
