import type { LandingPageKeys } from "../../../src/common/translations/localize";
import type { HassioResponse } from "../../../src/data/hassio/common";
import type {
  DockerNetwork,
  NetworkInterface,
} from "../../../src/data/hassio/network";
import type { HassioResolution } from "../../../src/data/hassio/resolution";
import { handleFetchPromise } from "../../../src/util/hass-call-api";

// Supervisor log lines start with a color code and a timestamp, for example
// "\x1b[31m2026-10-21 22:27:32.135+02:00 ERROR (MainThread) ..."
// eslint-disable-next-line no-control-regex
const LOG_ERROR_LINE = /^(?:\x1b\[[0-9;]*m)*[\d\s.:+-]+(?:ERROR|CRITICAL)\b/;

export const isSupervisorLogError = (line: string): boolean =>
  LOG_ERROR_LINE.test(line);

export interface NetworkInfo {
  interfaces: NetworkInterface[];
  docker: DockerNetwork;
  host_internet: boolean;
  supervisor_internet: boolean;
}

interface SupervisorJob {
  name: string;
  reference: string | null;
  uuid: string;
  progress: number; // float, 0–100
  stage: string | null;
  done: boolean;
  errors: {
    type: string;
    message: string;
    stage: string | null;
  }[];
  created: string; // ISO datetime string
  extra: Record<string, unknown> | null;
  child_jobs: SupervisorJob[];
}

export interface SupervisorJobInfo {
  ignore_conditions: string[];
  jobs: SupervisorJob[];
}

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

export async function getSupervisorLogs(lines = 100) {
  return fetch(`/supervisor-api/supervisor/logs?lines=${lines}`, {
    headers: {
      Accept: "text/plain",
    },
  });
}

export async function getSupervisorLogsFollow(lines = 500) {
  return fetch(`/supervisor-api/supervisor/logs/follow?lines=${lines}`, {
    headers: {
      Accept: "text/plain",
    },
  });
}

export async function pingSupervisor() {
  return fetch("/supervisor-api/supervisor/ping");
}

export async function getSupervisorNetworkInfo(): Promise<NetworkInfo> {
  const responseData = await handleFetchPromise<HassioResponse<NetworkInfo>>(
    fetch("/supervisor-api/network/info")
  );
  return responseData?.data;
}

export async function getSupervisorResolutionInfo(): Promise<HassioResolution> {
  const responseData = await handleFetchPromise<
    HassioResponse<HassioResolution>
  >(fetch("/supervisor-api/resolution/info"));
  return responseData?.data;
}

export async function getSupervisorJobsInfo(): Promise<
  HassioResponse<SupervisorJobInfo>
> {
  const responseData = await handleFetchPromise<
    HassioResponse<SupervisorJobInfo>
  >(fetch("/supervisor-api/jobs/info"));
  return responseData;
}

export const setSupervisorNetworkDns = async (
  dnsServerIndex: number,
  primaryInterface: string
) =>
  fetch(`/supervisor-api/network/interface/${primaryInterface}/update`, {
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
