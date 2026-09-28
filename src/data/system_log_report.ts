import {
  GITHUB_CORE_ISSUES_URL,
  GITHUB_FRONTEND_ISSUES_URL,
} from "../common/url/github";
import {
  createQueryString,
  type QueryParamConfig,
} from "../common/url/query-params";
import { sanitizeHttpUrl } from "../common/url/sanitize-http-url";
import { documentationUrlForVersion } from "../util/documentation-url";
import type { IntegrationManifest } from "./integration";
import type { LoggedError } from "./system_log";
import {
  getLoggedErrorIntegration,
  isCustomIntegrationError,
} from "./system_log";

const frontendIssueQueryParams = {
  string: ["template", "core_version", "javascript_errors"],
} as const satisfies QueryParamConfig;

const coreIssueQueryParams = {
  string: [
    "template",
    "version",
    "installation_type",
    "integration_name",
    "integration_link",
    "logs",
  ],
} as const satisfies QueryParamConfig;

const coreIssueTemplateUrl = `${GITHUB_CORE_ISSUES_URL}/new?${createQueryString(
  { template: "bug_report.yml" },
  coreIssueQueryParams
)}`;

export const systemLogReportUrl = (
  item: LoggedError,
  coreVersion: string,
  manifest?: IntegrationManifest | null,
  installationType?: string
): string => {
  const log = [
    item.name,
    item.source.join(":"),
    ...item.message,
    item.exception,
  ]
    .filter(Boolean)
    .join("\n\n");

  const includeLogs = new URLSearchParams({ log }).toString().length <= 6000;

  if (/^frontend\.js(?:_dev)?(?:\.|$)/.test(item.name)) {
    return `${GITHUB_FRONTEND_ISSUES_URL}/new?${createQueryString(
      {
        template: "bug_report.yml",
        core_version: coreVersion,
        javascript_errors: includeLogs ? log : undefined,
      },
      frontendIssueQueryParams
    )}`;
  }

  if (getLoggedErrorIntegration(item) && !manifest) {
    return coreIssueTemplateUrl;
  }

  if (isCustomIntegrationError(item) || manifest?.is_built_in === false) {
    return sanitizeHttpUrl(manifest?.issue_tracker) || coreIssueTemplateUrl;
  }

  return `${GITHUB_CORE_ISSUES_URL}/new?${createQueryString(
    {
      template: "bug_report.yml",
      version: coreVersion,
      installation_type: installationType,
      integration_name: manifest?.name,
      integration_link: manifest
        ? documentationUrlForVersion(
            coreVersion,
            `/integrations/${encodeURIComponent(manifest.domain)}/`
          )
        : undefined,
      logs: includeLogs ? log : undefined,
    },
    coreIssueQueryParams
  )}`;
};
