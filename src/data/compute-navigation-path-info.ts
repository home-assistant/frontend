import { mdiDevices, mdiLink, mdiPuzzle, mdiTextureBox } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { computeDeviceName } from "../common/entity/compute_device_name";
import {
  getIngressPanelInfoCollection,
  type IngressPanelInfoMap,
} from "./hassio/ingress";
import { getLovelaceCollection } from "./lovelace";
import type { LovelaceRawConfig } from "./lovelace/config/types";
import { computeViewIcon, computeViewTitle } from "./lovelace/config/view";
import {
  getPanelIcon,
  getPanelIconPath,
  getPanelTitleFromUrlPath,
} from "./panel";
import type { HomeAssistant } from "../types";

export interface NavigationPathInfo {
  label: string;
  icon?: string;
  iconPath: string;
}

export const DEFAULT_NAVIGATION_PATH_INFO: NavigationPathInfo = {
  label: "",
  iconPath: mdiLink,
};

const AREA_VIEW_PREFIX = "areas-";

/**
 * Resolve a navigation path to a display label and icon.
 * Works synchronously for panels, areas, and devices.
 * For lovelace views, pass the dashboard config to resolve view title/icon.
 */
export const computeNavigationPathInfo = (
  hass: HomeAssistant,
  path: string,
  lovelaceConfig?: LovelaceRawConfig,
  ingressPanels?: IngressPanelInfoMap
): NavigationPathInfo => {
  const segments = path.replace(/^\//, "").split(/[/?]/);
  const panelUrlPath = segments[0];
  const subPath = segments[1];

  // /config/areas/area/{areaId}
  if (
    panelUrlPath === "config" &&
    segments[1] === "areas" &&
    segments[2] === "area" &&
    segments[3]
  ) {
    return computeAreaNavigationPathInfo(hass, segments[3]);
  }

  // /config/devices/device/{deviceId}
  if (
    panelUrlPath === "config" &&
    segments[1] === "devices" &&
    segments[2] === "device" &&
    segments[3]
  ) {
    return computeDeviceNavigationPathInfo(hass, segments[3]);
  }

  // /app/<slug> (ingress addon panel)
  if (panelUrlPath === "app" && subPath) {
    return computeIngressNavigationPathInfo(subPath, ingressPanels);
  }

  const panel = panelUrlPath ? hass.panels[panelUrlPath] : undefined;
  const panelIcon = panel ? getPanelIcon(panel) : undefined;
  const panelIconPath = panel ? getPanelIconPath(panel) : undefined;

  // /home/areas-{areaId} (area dashboard view)
  if (subPath?.startsWith(AREA_VIEW_PREFIX)) {
    const areaId = subPath.slice(AREA_VIEW_PREFIX.length);
    return computeAreaNavigationPathInfo(hass, areaId);
  }

  const isDashboard = panel?.component_name === "lovelace";

  const panelInfo: NavigationPathInfo = {
    label: getPanelTitleFromUrlPath(hass, panelUrlPath) || panelUrlPath,
    icon: panelIcon || (isDashboard ? "mdi:view-dashboard" : undefined),
    iconPath: panelIconPath || mdiLink,
  };

  // Lovelace view path
  if (subPath && lovelaceConfig && "views" in lovelaceConfig) {
    const viewIndex = lovelaceConfig.views.findIndex(
      (v, index) => (v.path ?? String(index)) === subPath
    );
    if (viewIndex !== -1) {
      const view = lovelaceConfig.views[viewIndex];
      return {
        ...panelInfo,
        label: computeViewTitle(view, viewIndex),
        icon: computeViewIcon(view),
      };
    }
  }

  return panelInfo;
};

const computeAreaNavigationPathInfo = (
  hass: HomeAssistant,
  areaId: string
): NavigationPathInfo => {
  const area = hass.areas[areaId];
  return {
    label: area?.name || areaId,
    icon: area?.icon || undefined,
    iconPath: mdiTextureBox,
  };
};

const computeDeviceNavigationPathInfo = (
  hass: HomeAssistant,
  deviceId: string
): NavigationPathInfo => {
  const device = hass.devices[deviceId];
  return {
    label: (device ? computeDeviceName(device) : undefined) || deviceId,
    iconPath: mdiDevices,
  };
};

const computeIngressNavigationPathInfo = (
  slug: string,
  ingressPanels?: IngressPanelInfoMap
): NavigationPathInfo => {
  const panel = ingressPanels?.[slug];
  return {
    label: panel?.title || slug,
    icon: panel?.icon || undefined,
    iconPath: mdiPuzzle,
  };
};

/**
 * Subscribe to navigation path info updates.
 * Resolves synchronously first, then subscribes to lovelace config
 * updates for view paths.
 */
export const subscribeNavigationPathInfo = (
  hass: HomeAssistant,
  path: string,
  onChange: (info: NavigationPathInfo) => void
): UnsubscribeFunc | undefined => {
  const segments = path.replace(/^\//, "").split(/[/?]/);
  const panelUrlPath = segments[0];

  // Subscribe to ingress panels for /app/<slug> paths
  if (
    panelUrlPath === "app" &&
    segments[1] &&
    isComponentLoaded(hass.config, "hassio")
  ) {
    try {
      const collection = getIngressPanelInfoCollection(hass.connection);
      // Use cached state for immediate resolution if available
      const info = computeNavigationPathInfo(
        hass,
        path,
        undefined,
        collection.state
      );
      onChange(info);
      let current = info;
      return collection.subscribe((panels) => {
        const newInfo = computeNavigationPathInfo(
          hass,
          path,
          undefined,
          panels
        );
        if (newInfo.label !== current.label || newInfo.icon !== current.icon) {
          current = newInfo;
          onChange(newInfo);
        }
      });
    } catch (_err) {
      // Supervisor may not be available
    }
  }

  const info = computeNavigationPathInfo(hass, path);
  onChange(info);

  const panel = panelUrlPath ? hass.panels[panelUrlPath] : undefined;
  if (segments[1] && panel?.component_name === "lovelace") {
    let current = info;
    const collection = getLovelaceCollection(hass.connection, panelUrlPath);
    return collection.subscribe((config) => {
      const newInfo = computeNavigationPathInfo(hass, path, config);
      if (newInfo.label !== current.label || newInfo.icon !== current.icon) {
        current = newInfo;
        onChange(newInfo);
      }
    });
  }

  return undefined;
};
