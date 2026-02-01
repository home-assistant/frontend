import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockTemplate = (hass: MockHomeAssistant) => {
  hass.mockAPI("template", () =>
    Promise.reject({
      body: { message: "Template dev tool does not work in the demo." },
    })
  );
  hass.mockWS("render_template", (msg, _hass, onChange) => {
    let result = msg.template;
    // Simple variable substitution for demo purposes
    if (msg.variables) {
      for (const [key, value] of Object.entries(msg.variables)) {
        result = result.replace(
          new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
          String(value)
        );
      }
    }
    onChange!({
      result,
      listeners: { all: false, domains: [], entities: [], time: false },
    });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  });
};
