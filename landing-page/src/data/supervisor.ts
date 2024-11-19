import type { LandingPageKeys } from "../../../src/common/translations/localize";

export const ALTERNATIVE_DNS_SERVERS: {
  ipv4: string[];
  ipv6: string[];
  translationKey: LandingPageKeys;
}[] = [
  {
    ipv4: ["1.1.1.1", "1.0.0.1"],
    ipv6: ["2606:4700:4700::1111", "2606:4700:4700::1001"],
    translationKey: "network_issue.use_cloudflare",
  },
  {
    ipv4: ["8.8.8.8", "8.8.4.4"],
    ipv6: ["2001:4860:4860::8888", "2001:4860:4860::8844"],
    translationKey: "network_issue.use_google",
  },
];

export async function getSupervisorNetworkInfo() {
  return fetch("/supervisor/network/info");
}

export const setSupervisorNetworkDns = async (dnsServerIndex: number) =>
  fetch("/supervisor/network/dns", {
    method: "POST",
    body: JSON.stringify({
      ipv4: {
        method: "auto",
        nameservers: ALTERNATIVE_DNS_SERVERS[dnsServerIndex].ipv4,
      },
      ipv6: {
        method: "auto",
        nameservers: ALTERNATIVE_DNS_SERVERS[dnsServerIndex].ipv6,
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
