import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockTemplate = (hass: MockHomeAssistant) => {
  hass.mockAPI("template", () =>
    Promise.reject({
      body: { message: "Template dev tool does not work in the demo." },
    })
  );
  hass.mockWS("render_template", (msg, _hass, onChange) => {
    onChange!({
      result: msg.template,
      listeners: { all: false, domains: [], entities: [], time: false },
    });
    return () => {};
  });
};
