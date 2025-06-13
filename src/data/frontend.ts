import type { Connection } from "home-assistant-js-websocket";

export interface CoreFrontendUserData {
  showAdvanced?: boolean;
  showEntityIdPicker?: boolean;
}

export interface SidebarFrontendUserData {
  panelOrder: string[];
  hiddenPanels: string[];
  defaultPanel?: string;
}

declare global {
  interface FrontendUserData {
    core: CoreFrontendUserData;
    sidebar: SidebarFrontendUserData;
  }
}

export type ValidUserDataKey = keyof FrontendUserData;

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
