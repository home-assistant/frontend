import { HomeAssistant } from "../types";

interface DiagnosticInfo {
  domain: string;
  handlers: {
    config_entry: boolean;
  };
}

export const fetchDiagnosticHandlers = (
  hass: HomeAssistant
): Promise<DiagnosticInfo[]> =>
  hass.callWS<DiagnosticInfo[]>({
    type: "diagnostics/list",
  });

export const getConfigEntryDiagnosticsDownloadUrl = (entry_id: string) =>
  `/api/diagnostics/config_entry/${entry_id}`;
