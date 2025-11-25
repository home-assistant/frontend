import type { Connection } from "home-assistant-js-websocket";

export interface CoreFrontendUserData {
  showAdvanced?: boolean;
  showEntityIdPicker?: boolean;
  default_panel?: string;
}

export interface SidebarFrontendUserData {
  panelOrder?: string[];
  hiddenPanels?: string[];
}

export interface CoreFrontendSystemData {
  default_panel?: string;
}

export interface HomeFrontendSystemData {
  favorite_entities?: string[];
}

declare global {
  interface FrontendUserData {
    core: CoreFrontendUserData;
    sidebar: SidebarFrontendUserData;
  }
  interface FrontendSystemData {
    core: CoreFrontendSystemData;
    home: HomeFrontendSystemData;
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
