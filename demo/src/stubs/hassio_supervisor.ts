import { HassioSupervisorInfo } from "../../../src/data/hassio/supervisor";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockHassioSupervisor = (hass: MockHomeAssistant) => {
  hass.config.components.push("hassio");
  hass.mockWS("supervisor/api", (msg) => {
    if (msg.endpoint === "/supervisor/info") {
      const data: HassioSupervisorInfo = {
        version: "2021.10.dev0805",
        version_latest: "2021.10.dev0806",
        update_available: true,
        channel: "dev",
        arch: "aarch64",
        supported: true,
        healthy: true,
        ip_address: "172.30.32.2",
        wait_boot: 5,
        timezone: "America/Los_Angeles",
        logging: "info",
        debug: false,
        debug_block: false,
        diagnostics: true,
        addons: [
          {
            name: "Visual Studio Code",
            slug: "a0d7b954_vscode",
            description:
              "Fully featured VSCode experience, to edit your HA config in the browser, including auto-completion!",
            state: "started",
            version: "3.6.2",
            version_latest: "3.6.2",
            update_available: false,
            repository: "a0d7b954",
            icon: false,
            logo: true,
          },
          {
            name: "Z-Wave JS",
            slug: "core_zwave_js",
            description:
              "Control a ZWave network with Home Assistant Z-Wave JS",
            state: "started",
            version: "0.1.45",
            version_latest: "0.1.45",
            update_available: false,
            repository: "core",
            icon: true,
            logo: true,
          },
        ] as any,
        addons_repositories: [
          "https://github.com/hassio-addons/repository",
        ] as any,
      };
      return data;
    }
    return Promise.reject(`${msg.method} ${msg.endpoint} is not implemented`);
  });
};
