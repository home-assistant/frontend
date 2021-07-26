export interface DiscoveryInformation {
  uuid: string;
  base_url: string | null;
  external_url: string | null;
  internal_url: string | null;
  location_name: string;
  installation_type: string;
  requires_api_password: boolean;
  version: string;
}

export const fetchDiscoveryInformation =
  async (): Promise<DiscoveryInformation> => {
    const response = await fetch("/api/discovery_info", { method: "GET" });
    return response.json();
  };
