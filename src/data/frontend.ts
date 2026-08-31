import type { Connection } from "home-assistant-js-websocket";
import type { ShortcutItem } from "./home_shortcuts";

export interface SurveyInteraction {
  date: string;
  action: "opened" | "dismissed";
}

export interface CoreFrontendUserData {
  showEntityIdPicker?: boolean;
  default_panel?: string;
  apps_info_dismissed?: boolean;
  dashboard_favorite_card_types?: string[];
}

export interface SidebarFrontendUserData {
  panelOrder?: string[];
  hiddenPanels?: string[];
}

export interface CoreFrontendSystemData {
  default_panel?: string;
  onboarded_version?: string;
  onboarded_date?: string;
  surveys?: {
    onboarding?: SurveyInteraction;
  };
}

export interface HomeFrontendSystemData {
  favorite_entities?: string[];
  welcome_banner_dismissed?: boolean;
  hide_welcome_message?: boolean;
  hide_suggested_entities?: boolean;
  shortcuts?: ShortcutItem[];
}

export type SecurityAlertSeverity = "alert" | "warning";

export interface SecurityAlertEntityConfig {
  entity: string;
  severity?: SecurityAlertSeverity;
}

export interface SecurityFrontendSystemData {
  alert_entities?: SecurityAlertEntityConfig[];
  favorite_entities?: string[];
}

export interface EnergyFrontendSystemData {
  // Stable "<view>.<card-type>" keys of energy dashboard cards the user has
  // hidden. An absent key or array means nothing is hidden (all cards visible),
  // so cards added in the future are shown by default.
  hidden_cards?: string[];
}

declare global {
  interface FrontendUserData {
    core: CoreFrontendUserData;
    sidebar: SidebarFrontendUserData;
  }
  interface FrontendSystemData {
    core: CoreFrontendSystemData;
    home: HomeFrontendSystemData;
    energy: EnergyFrontendSystemData;
    security: SecurityFrontendSystemData;
  }
}

export type ValidUserDataKey = keyof FrontendUserData;

export type ValidSystemDataKey = keyof FrontendSystemData;

export const fetchFrontendUserData = async <
  UserDataKey extends ValidUserDataKey,
>(
  conn: Connection,
  key: UserDataKey
): Promise<FrontendUserData[UserDataKey] | null> => {
  const result = await conn.sendMessagePromise<{
    value: FrontendUserData[UserDataKey] | null;
  }>({
    type: "frontend/get_user_data",
    key,
  });
  return result.value;
};

export const saveFrontendUserData = async <
  UserDataKey extends ValidUserDataKey,
>(
  conn: Connection,
  key: UserDataKey,
  value: FrontendUserData[UserDataKey]
): Promise<void> =>
  conn.sendMessagePromise<undefined>({
    type: "frontend/set_user_data",
    key,
    value,
  });

export const subscribeFrontendUserData = <UserDataKey extends ValidUserDataKey>(
  conn: Connection,
  userDataKey: UserDataKey,
  onChange: (data: { value: FrontendUserData[UserDataKey] | null }) => void
) =>
  conn.subscribeMessage<{ value: FrontendUserData[UserDataKey] | null }>(
    onChange,
    {
      type: "frontend/subscribe_user_data",
      key: userDataKey,
    }
  );

export const fetchFrontendSystemData = async <
  SystemDataKey extends ValidSystemDataKey,
>(
  conn: Connection,
  key: SystemDataKey
): Promise<FrontendSystemData[SystemDataKey] | null> => {
  const result = await conn.sendMessagePromise<{
    value: FrontendSystemData[SystemDataKey] | null;
  }>({
    type: "frontend/get_system_data",
    key,
  });
  return result.value;
};

export const saveFrontendSystemData = async <
  SystemDataKey extends ValidSystemDataKey,
>(
  conn: Connection,
  key: SystemDataKey,
  value: FrontendSystemData[SystemDataKey]
): Promise<void> =>
  conn.sendMessagePromise<undefined>({
    type: "frontend/set_system_data",
    key,
    value,
  });

export const subscribeFrontendSystemData = <
  SystemDataKey extends ValidSystemDataKey,
>(
  conn: Connection,
  systemDataKey: SystemDataKey,
  onChange: (data: { value: FrontendSystemData[SystemDataKey] | null }) => void
) =>
  conn.subscribeMessage<{ value: FrontendSystemData[SystemDataKey] | null }>(
    onChange,
    {
      type: "frontend/subscribe_system_data",
      key: systemDataKey,
    }
  );
