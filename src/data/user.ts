import { HomeAssistant } from "../types";
import { Credential } from "./auth";

export interface User {
  id: string;
  name: string;
  is_owner: boolean;
  is_active: boolean;
  system_generated: boolean;
  group_ids: string[];
  credentials: Credential[];
}

interface UpdateUserParams {
  name?: User["name"];
  group_ids?: User["group_ids"];
}

export const fetchUsers = async (hass: HomeAssistant) =>
  hass.callWS<User[]>({
    type: "config/auth/list",
  });

export const createUser = async (hass: HomeAssistant, name: string) =>
  hass.callWS<{ user: User }>({
    type: "config/auth/create",
    name,
  });

export const updateUser = async (
  hass: HomeAssistant,
  userId: string,
  params: UpdateUserParams
) =>
  hass.callWS<{ user: User }>({
    ...params,
    type: "config/auth/update",
    user_id: userId,
  });

export const deleteUser = async (hass: HomeAssistant, userId: string) =>
  hass.callWS<void>({
    type: "config/auth/delete",
    user_id: userId,
  });
