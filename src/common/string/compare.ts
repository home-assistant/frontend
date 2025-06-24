import memoizeOne from "memoize-one";
import { isIPAddress } from "./is_ip_address";

const collator = memoizeOne(
  (language: string | undefined) => new Intl.Collator(language)
);

const caseInsensitiveCollator = memoizeOne(
  (language: string | undefined) =>
    new Intl.Collator(language, { sensitivity: "accent" })
);

const fallbackStringCompare = (a: string, b: string) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }

  return 0;
};

export const stringCompare = (
  a: string,
  b: string,
  language: string | undefined = undefined
) => {
  // @ts-ignore
  if (Intl?.Collator) {
    return collator(language).compare(a, b);
  }

  return fallbackStringCompare(a, b);
};

export const ipCompare = (a: string, b: string) => {
  const aIsIpV4 = isIPAddress(a);
  const bIsIpV4 = isIPAddress(b);

  if (aIsIpV4 && bIsIpV4) {
    return ipv4Compare(a, b);
  }
  if (!aIsIpV4 && !bIsIpV4) {
    return ipV6Compare(a, b);
  }
  return aIsIpV4 ? -1 : 1;
};

export const caseInsensitiveStringCompare = (
  a: string,
  b: string,
  language: string | undefined = undefined
) => {
  // @ts-ignore
  if (Intl?.Collator) {
    return caseInsensitiveCollator(language).compare(a, b);
  }

  return fallbackStringCompare(a.toLowerCase(), b.toLowerCase());
};

export const orderCompare = (order: string[]) => (a: string, b: string) => {
  const idxA = order.indexOf(a);
  const idxB = order.indexOf(b);

  if (idxA === idxB) {
    return 0;
  }

  if (idxA === -1) {
    return 1;
  }

  if (idxB === -1) {
    return -1;
  }

  return idxA - idxB;
};

function ipv4Compare(a: string, b: string) {
  const num1 = Number(
    a
      .split(".")
      .map((num) => num.padStart(3, "0"))
      .join("")
  );
  const num2 = Number(
    b
      .split(".")
      .map((num) => num.padStart(3, "0"))
      .join("")
  );
  return num1 - num2;
}

function ipV6Compare(a: string, b: string) {
  const ipv6a = normalizeIPv6(a)
    .split(":")
    .map((part) => part.padStart(4, "0"))
    .join("");
  const ipv6b = normalizeIPv6(b)
    .split(":")
    .map((part) => part.padStart(4, "0"))
    .join("");

  return ipv6a.localeCompare(ipv6b);
}

function normalizeIPv6(ip) {
  const parts = ip.split("::");
  const head = parts[0].split(":");
  const tail = parts[1] ? parts[1].split(":") : [];
  const totalParts = 8;
  const missing = totalParts - (head.length + tail.length);
  const zeros = new Array(missing).fill("0");
  return [...head, ...zeros, ...tail].join(":");
}
