import { expect, type Page } from "@playwright/test";
import {
  QUICK_TIMEOUT,
  rendersRoute,
  routeCase,
  routeCases,
  SHELL_TIMEOUT,
  type RouteSmokeCase,
  type RouteSmokeGroup,
} from "../../helpers";
import { e2ePanelRouteAssertions } from "./ha-test-panels";

interface E2ELovelaceRoot extends HTMLElement {
  lovelace?: {
    setEditMode: (editMode: boolean) => void;
  };
}

async function setLovelaceEditMode(page: Page, editMode: boolean) {
  await page
    .locator("hui-root")
    .first()
    .waitFor({ state: "attached", timeout: QUICK_TIMEOUT });
  await page
    .locator("hui-root")
    .first()
    .evaluate(async (el: Element, value) => {
      const root = el as E2ELovelaceRoot;
      const start = performance.now();
      await new Promise<void>((resolve, reject) => {
        const check = () => {
          if (root.lovelace?.setEditMode) {
            resolve();
            return;
          }
          if (performance.now() - start > 2000) {
            reject(new Error("Lovelace edit mode action was not available"));
            return;
          }
          requestAnimationFrame(check);
        };
        check();
      });
      root.lovelace!.setEditMode(value);
    }, editMode);
}

const PANEL_ROUTE_ASSERTIONS = Array.from(
  e2ePanelRouteAssertions,
  ([path, element]) => routeCase(path, element)
);

const URL_NORMALIZATION_ASSERTIONS: RouteSmokeCase[] = [
  {
    name: "keeps the todo panel when adding the selected entity query",
    path: "/todo",
    element: "ha-panel-todo",
    url: /\/\?entity_id=todo\.shopping_list#\/todo$/,
  },
  {
    name: "keeps the history panel when removing the back query",
    path: "/?back=1#/history",
    element: "ha-panel-history, history-panel",
    url: /\/#\/history$/,
  },
  {
    name: "keeps the logbook panel when removing the back query",
    path: "/?back=1#/logbook",
    element: "ha-panel-logbook",
    url: /\/#\/logbook$/,
  },
  {
    name: "keeps the lovelace panel when adding the edit query",
    path: "/lovelace",
    element: "ha-panel-lovelace, hui-root",
    url: /\/\?edit=1#\/lovelace\/home$/,
    action: (page) => setLovelaceEditMode(page, true),
  },
  {
    name: "keeps the lovelace panel when removing the edit query",
    path: "/lovelace",
    element: "ha-panel-lovelace, hui-root",
    url: /\/#\/lovelace\/home$/,
    action: async (page) => {
      await setLovelaceEditMode(page, true);
      await expect(page).toHaveURL(/\/\?edit=1#\/lovelace\/home$/, {
        timeout: SHELL_TIMEOUT,
      });
      await setLovelaceEditMode(page, false);
    },
  },
];

const TOOLS_SUBPAGES: { route: string; element: string }[] = [
  { route: "yaml", element: "tools-yaml-config" },
  { route: "state", element: "tools-state" },
  { route: "action", element: "tools-action" },
  { route: "template", element: "tools-template" },
  { route: "event", element: "tools-event" },
  { route: "statistics", element: "tools-statistics" },
  { route: "assist", element: "tools-assist" },
  { route: "debug", element: "tools-debug" },
];

const TOOLS_ROUTE_ASSERTIONS = [
  routeCase("/config/tools", "ha-panel-tools"),
  ...TOOLS_SUBPAGES.map(({ route, element }) =>
    routeCase(`/config/tools/${route}`, element)
  ),
  routeCase("/config/tools/service", "tools-action"),
];

const TOOLS_REDIRECT_ASSERTIONS = [
  ...["/developer-tools", "/config/developer-tools"].flatMap((oldBase) => [
    routeCase(oldBase, "ha-panel-tools"),
    routeCase(`${oldBase}/state`, "tools-state"),
  ]),
];

const CONFIG_ROUTES = routeCases([
  ["/config/integrations", "ha-config-integrations"],
  ["/config/devices", "ha-config-devices"],
  ["/config/entities", "ha-config-entities"],
  ["/config/helpers", "ha-config-helpers"],
  ["/config/areas", "ha-config-areas"],
  ["/config/apps", "ha-config-apps"],
  ["/config/app", "ha-config-app-dashboard"],
  ["/config/automation", "ha-config-automation"],
  ["/config/backup", "ha-config-backup"],
  ["/config/scene", "ha-config-scene"],
  ["/config/script", "ha-config-script"],
  ["/config/blueprint", "ha-config-blueprint"],
  ["/config/cloud", "ha-config-cloud"],
  ["/config/energy", "ha-config-energy"],
  ["/config/hardware", "ha-config-hardware"],
  ["/config/labs", "ha-config-labs"],
  ["/config/lovelace", "ha-config-lovelace"],
  ["/config/person", "ha-config-person"],
  ["/config/storage", "ha-config-section-storage"],
  ["/config/tags", "ha-config-tags"],
  ["/config/users", "ha-config-users"],
  ["/config/voice-assistants", "ha-config-voice-assistants"],
  ["/config/system", "ha-config-system-navigation"],
  ["/config/info", "ha-config-info"],
  ["/config/logs", "ha-config-logs"],
  ["/config/general", "ha-config-section-general"],
  ["/config/updates", "ha-config-section-updates"],
  ["/config/repairs", "ha-config-repairs-dashboard"],
  ["/config/analytics", "ha-config-section-analytics"],
  ["/config/ai-tasks", "ha-config-section-ai-tasks"],
  ["/config/labels", "ha-config-labels"],
  ["/config/zone", "ha-config-zone"],
  ["/config/network", "ha-config-section-network"],
  ["/config/application_credentials", "ha-config-application-credentials"],
  ["/config/bluetooth", "bluetooth-config-dashboard-router"],
  ["/config/dhcp", "dhcp-config-panel"],
  ["/config/infrared", "infrared-config-dashboard-router"],
  ["/config/matter", "matter-config-panel"],
  ["/config/mqtt", "mqtt-config-panel"],
  ["/config/radio-frequency", "radio-frequency-config-dashboard-router"],
  ["/config/ssdp", "ssdp-config-panel"],
  ["/config/thread", "thread-config-panel"],
  ["/config/zeroconf", "zeroconf-config-panel"],
  ["/config/zha", "zha-config-dashboard-router"],
  ["/config/zwave_js", "zwave_js-config-router"],
]);

const NESTED_CONFIG_ROUTES = routeCases([
  ["/config/integrations/dashboard", "ha-config-integrations-dashboard"],
  ["/config/devices/dashboard", "ha-config-devices-dashboard"],
  ["/config/areas/dashboard", "ha-config-areas-dashboard"],
  ["/config/backup/settings", "ha-config-backup-settings"],
]);

export const appRouteSmokeGroups: RouteSmokeGroup[] = [
  {
    name: "Panel navigation",
    routes: PANEL_ROUTE_ASSERTIONS,
    testName: (route) => `renders registered panel ${route.path}`,
  },
  {
    name: "Panel URL normalization",
    routes: URL_NORMALIZATION_ASSERTIONS,
    testName: (route) => route.name!,
  },
  {
    name: "Tools panel",
    routes: TOOLS_ROUTE_ASSERTIONS,
    testName: rendersRoute,
  },
  {
    name: "Tools redirects",
    routes: TOOLS_REDIRECT_ASSERTIONS,
    testName: (route) => `redirects ${route.path}`,
  },
  {
    name: "Config routes",
    routes: CONFIG_ROUTES,
    testName: rendersRoute,
  },
  {
    name: "Nested config routes",
    routes: NESTED_CONFIG_ROUTES,
    testName: rendersRoute,
  },
];
