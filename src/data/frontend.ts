import { Connection } from "home-assistant-js-websocket";
import { getOptimisticCollection } from "./collection";

export enum NumberFormat {
  auto = "auto",
  comma_decimal = "comma_decimal",
  decimal_comma = "decimal_comma",
  none = "none",
}

export interface CoreFrontendUserData {
  showAdvanced?: boolean;
  numberFormat?: NumberFormat;
}

declare global {
  interface FrontendUserData {
    core: CoreFrontendUserData;
  }
}

export type ValidUserDataKey = keyof FrontendUserData;

export const fetchFrontendUserData = async <
  UserDataKey extends ValidUserDataKey
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
  UserDataKey extends ValidUserDataKey
>(
  conn: Connection,
  key: UserDataKey,
  value: FrontendUserData[UserDataKey]
): Promise<void> =>
  conn.sendMessagePromise<void>({
    type: "frontend/set_user_data",
    key,
    value,
  });

export const getOptimisticFrontendUserDataCollection = <
  UserDataKey extends ValidUserDataKey
>(
  conn: Connection,
  userDataKey: UserDataKey
) =>
  getOptimisticCollection(
    (_conn, data) =>
      saveFrontendUserData(
        conn,
        userDataKey,
        // @ts-ignore
        data
      ),
    conn,
    `_frontendUserData-${userDataKey}`,
    () => fetchFrontendUserData(conn, userDataKey)
  );

export const subscribeFrontendUserData = <UserDataKey extends ValidUserDataKey>(
  conn: Connection,
  userDataKey: UserDataKey,
  onChange: (state: FrontendUserData[UserDataKey] | null) => void
) =>
  getOptimisticFrontendUserDataCollection(conn, userDataKey).subscribe(
    onChange
  );
