import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockSystemHealth = (hass: MockHomeAssistant) => {
  hass.mockWS(
    "system_health/info",
    (_msg, _hass, onChange?: (event: any) => void) => {
      // Defer so the consumer's unsubscribe handle is initialized first
      // (real WS events arrive asynchronously).
      setTimeout(() => {
        onChange?.({
          type: "initial",
          data: {
            homeassistant: {
              info: {
                version: "DEMO",
                installation_type: "Home Assistant OS",
                dev: false,
                hassio: true,
                docker: true,
                container_arch: "aarch64",
                user: "root",
                virtualenv: false,
                python_version: "3.13.0",
                os_name: "Linux",
                os_version: "6.6.0",
                arch: "aarch64",
                timezone: "America/Los_Angeles",
                config_dir: "/config",
              },
            },
          },
        });
      });
      return () => undefined;
    }
  );
};
