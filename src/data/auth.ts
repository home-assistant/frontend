import { HomeAssistant } from "../types";

export interface AuthProvider {
  name: string;
  id: string;
  type: string;
}

interface Credential {
  type: string;
}

export interface User {
  id: string;
  name: string;
  is_owner: boolean;
  is_active: boolean;
  system_generated: boolean;
  group_ids: string[];
  credentials: Credential[];
}

export const fetchUsers = async (hass: HomeAssistant) =>
  hass.callWS<User[]>({
    type: "config/auth/list",
  });
