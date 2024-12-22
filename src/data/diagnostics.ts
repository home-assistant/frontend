import { HomeAssistant } from "../types";

export interface DiagnosticInfo {
  domain: string;
  handlers: {
    config_entry: boolean;
    device: boolean;
  };
}

export const fetchDiagnosticHandlers = (
  hass: HomeAssistant
): Promise<DiagnosticInfo[]> =>
  hass.callWS<DiagnosticInfo[]>({
    type: "diagnostics/list",
  });

export const fetchDiagnosticHandler = (
  hass: HomeAssistant,
  domain: string
): Promise<DiagnosticInfo> =>
  hass.callWS<DiagnosticInfo>({
    type: "diagnostics/get",
    domain,
  });

export const getConfigEntryDiagnosticsDownloadUrl = (entry_id: string) =>
  `/api/diagnostics/config_entry/${entry_id}`;

export const getDeviceDiagnosticsDownloadUrl = (
  entry_id: string,
  device_id: string
) => `/api/diagnostics/config_entry/${entry_id}/device/${device_id}`;
