import {
  mdiCrownCircleOutline,
  mdiAlphaSCircleOutline,
  mdiHomeCircleOutline,
  mdiCancel,
} from "@mdi/js";
import { HomeAssistant, TranslationDict } from "../types";
import { Credential } from "./auth";

export const SYSTEM_GROUP_ID_ADMIN = "system-admin";
export const SYSTEM_GROUP_ID_USER = "system-users";
export const SYSTEM_GROUP_ID_READ_ONLY = "system-read-only";

export const GROUPS = [SYSTEM_GROUP_ID_USER, SYSTEM_GROUP_ID_ADMIN];

export interface User {
  id: string;
  username: string | null;
  name: string;
  is_owner: boolean;
  is_active: boolean;
  local_only: boolean;
  system_generated: boolean;
  group_ids: (keyof TranslationDict["groups"])[];
  credentials: Credential[];
}

export interface UpdateUserParams {
  name?: User["name"];
  is_active?: User["is_active"];
  group_ids?: User["group_ids"];
  local_only?: boolean;
}

export const fetchUsers = async (hass: HomeAssistant) =>
  hass.callWS<User[]>({
    type: "config/auth/list",
  });

export const createUser = async (
  hass: HomeAssistant,
  name: string,
  // eslint-disable-next-line: variable-name
  group_ids?: User["group_ids"],
  local_only?: boolean
) =>
  hass.callWS<{ user: User }>({
    type: "config/auth/create",
    name,
    group_ids,
    local_only,
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

export const computeUserInitials = (name: string) => {
  if (!name) {
    return "?";
  }
  return (
    name
      .trim()
      // Split by space and take first 3 words
      .split(" ")
      .slice(0, 3)
      // Of each word, take first letter
      .map((s) => s.substring(0, 1))
      .join("")
  );
};

const OWNER_ICON = mdiCrownCircleOutline;
const SYSTEM_ICON = mdiAlphaSCircleOutline;
const LOCAL_ICON = mdiHomeCircleOutline;
const DISABLED_ICON = mdiCancel;

export const computeUserBadges = (
  hass: HomeAssistant,
  user: User,
  includeSystem: boolean
) => {
  const labels: [string, string][] = [];
  const translate = (
    key: Extract<
      keyof TranslationDict["ui"]["panel"]["config"]["users"],
      `is_${string}`
    >
  ) => hass.localize(`ui.panel.config.users.${key}`);

  if (user.is_owner) {
    labels.push([OWNER_ICON, translate("is_owner")]);
  }
  if (includeSystem && user.system_generated) {
    labels.push([SYSTEM_ICON, translate("is_system")]);
  }
  if (user.local_only) {
    labels.push([LOCAL_ICON, translate("is_local")]);
  }
  if (!user.is_active) {
    labels.push([DISABLED_ICON, translate("is_not_active")]);
  }

  return labels;
};
