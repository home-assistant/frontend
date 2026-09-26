import type { Connection } from "home-assistant-js-websocket";
import type { MaintenanceFrontendSystemData } from "./frontend";
import { fetchFrontendSystemData, saveFrontendSystemData } from "./frontend";

export const fetchMaintenanceData = async (
  conn: Connection
): Promise<MaintenanceFrontendSystemData> =>
  (await fetchFrontendSystemData(conn, "maintenance")) ?? {};

export const saveMaintenanceData = (
  conn: Connection,
  data: MaintenanceFrontendSystemData
) => saveFrontendSystemData(conn, "maintenance", data);
