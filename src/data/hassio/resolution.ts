import type { HomeAssistant, TranslationDict } from "../../types";

export interface ResolutionIssue {
  type: string;
  context: string;
  reference: string | null;
  reference_extra: Record<string, unknown> | null;
  uuid: string;
}

export interface ResolutionSuggestion extends ResolutionIssue {
  auto: boolean;
}

export interface ResolutionCheck {
  enabled: boolean;
  slug: string;
}

export interface HassioResolution {
  unsupported: (keyof TranslationDict["ui"]["dialogs"]["unsupported"]["reasons"])[];
  unhealthy: (keyof TranslationDict["ui"]["dialogs"]["unhealthy"]["reasons"])[];
  issues: ResolutionIssue[];
  suggestions: ResolutionSuggestion[];
  checks: ResolutionCheck[];
}

export const fetchHassioResolution = async (
  hass: HomeAssistant
): Promise<HassioResolution> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/resolution/info",
    method: "get",
  });
