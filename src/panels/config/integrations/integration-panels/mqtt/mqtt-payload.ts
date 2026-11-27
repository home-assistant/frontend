export const parseJsonPayload = (payload: string): unknown => {
  const trimmed = payload.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed);
  } catch (_err) {
    return undefined;
  }
};

const JSON_WHITESPACE = new Set([" ", "\t", "\n", "\r"]);

/**
 * Indents a JSON payload without parsing it into values, so numbers, duplicate
 * keys and escapes stay exactly as received. Returns undefined when the payload
 * is not a JSON object or array.
 */
export const prettyPrintJson = (payload: string): string | undefined => {
  if (parseJsonPayload(payload) === undefined) {
    return undefined;
  }
  const text = payload.trim();
  let out = "";
  let depth = 0;
  let inString = false;
  let escaped = false;
  const newline = () => `\n${"  ".repeat(depth)}`;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      out += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (JSON_WHITESPACE.has(char)) {
      continue;
    }
    if (char === "{" || char === "[") {
      let next = i + 1;
      while (JSON_WHITESPACE.has(text[next])) {
        next++;
      }
      if (text[next] === (char === "{" ? "}" : "]")) {
        out += char + text[next];
        i = next;
        continue;
      }
      depth++;
      out += char + newline();
    } else if (char === "}" || char === "]") {
      depth--;
      out += newline() + char;
    } else if (char === ",") {
      out += `,${newline()}`;
    } else if (char === ":") {
      out += ": ";
    } else {
      if (char === '"') {
        inString = true;
      }
      out += char;
    }
  }
  return out;
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

// Keys that need it are quoted, so `{"a.b": 1}` and `{"a": {"b": 1}}` or an
// array index and a numeric object key never end up on the same path.
const childPath = (prefix: string, key: string, isArray: boolean): string => {
  if (isArray) {
    return `${prefix}[${key}]`;
  }
  if (!IDENTIFIER.test(key)) {
    return `${prefix}[${JSON.stringify(key)}]`;
  }
  return prefix ? `${prefix}.${key}` : key;
};

const flatten = (
  value: unknown,
  prefix: string,
  out: Map<string, string>
): Map<string, string> => {
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length && prefix) {
      out.set(prefix, JSON.stringify(value));
    }
    const isArray = Array.isArray(value);
    for (const [key, child] of entries) {
      flatten(child, childPath(prefix, key, isArray), out);
    }
  } else {
    out.set(prefix, JSON.stringify(value));
  }
  return out;
};

export interface PayloadChange {
  key: string;
  type: "added" | "removed" | "changed";
  oldValue?: string;
  newValue?: string;
}

// Returns undefined when the payloads cannot be compared key by key.
export const diffJsonPayloads = (
  oldPayload: string,
  newPayload: string
): PayloadChange[] | undefined => {
  const oldJson = parseJsonPayload(oldPayload);
  const newJson = parseJsonPayload(newPayload);
  // Also when the root changes between object and array: both empty flatten alike.
  if (
    oldJson === undefined ||
    newJson === undefined ||
    Array.isArray(oldJson) !== Array.isArray(newJson)
  ) {
    return undefined;
  }
  const oldFlat = flatten(oldJson, "", new Map());
  const newFlat = flatten(newJson, "", new Map());
  const changes: PayloadChange[] = [];
  for (const [key, newValue] of newFlat) {
    const oldValue = oldFlat.get(key);
    if (oldValue === undefined) {
      changes.push({ key, type: "added", newValue });
    } else if (oldValue !== newValue) {
      changes.push({ key, type: "changed", oldValue, newValue });
    }
  }
  for (const [key, oldValue] of oldFlat) {
    if (!newFlat.has(key)) {
      changes.push({ key, type: "removed", oldValue });
    }
  }
  return changes;
};
