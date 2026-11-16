import type {
  LovelaceConfig,
  LovelaceRawConfig,
} from "../../../../data/lovelace/config/types";
import { isStrategyDashboard } from "../../../../data/lovelace/config/types";

/**
 * Points a root-relative path at another dashboard. Only the first segment is
 * replaced, so a view that shares its path with the dashboard keeps it.
 */
export const replaceDashboardInPath = (
  path: string,
  fromUrlPath: string,
  toUrlPath: string
): string => {
  if (!path.startsWith(`/${fromUrlPath}`)) {
    return path;
  }
  const rest = path.slice(fromUrlPath.length + 1);
  return rest === "" || "/?#".includes(rest[0]) ? `/${toUrlPath}${rest}` : path;
};

const linkKey = (obj: Record<string, unknown>): string | undefined => {
  if (obj.action === "navigate") {
    return "navigation_path";
  }
  if (obj.action === "url") {
    return "url_path";
  }
  switch (obj.type) {
    case "area":
      return "navigation_path";
    case "weblink":
    case "iframe":
      return "url";
    default:
      return undefined;
  }
};

const replaceLinks = (
  value: unknown,
  fromUrlPath: string,
  toUrlPath: string
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => replaceLinks(item, fromUrlPath, toUrlPath));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const result = Object.fromEntries(
    Object.entries(obj).map(([key, child]) => [
      key,
      // Strategy options are not card config
      key === "strategy" ? child : replaceLinks(child, fromUrlPath, toUrlPath),
    ])
  );
  const key = linkKey(obj);
  if (key && typeof result[key] === "string") {
    result[key] = replaceDashboardInPath(result[key], fromUrlPath, toUrlPath);
  }
  if (obj.type === "cast" && obj.dashboard === fromUrlPath) {
    result.dashboard = toUrlPath;
  }
  return result;
};

export const replaceDashboardLinks = (
  config: LovelaceRawConfig,
  fromUrlPath: string,
  toUrlPath: string
): LovelaceRawConfig => {
  if (isStrategyDashboard(config)) {
    return config;
  }
  const result = replaceLinks(config, fromUrlPath, toUrlPath) as LovelaceConfig;
  result.views?.forEach((view) => {
    if (typeof view.back_path === "string") {
      view.back_path = replaceDashboardInPath(
        view.back_path,
        fromUrlPath,
        toUrlPath
      );
    }
  });
  return result;
};
