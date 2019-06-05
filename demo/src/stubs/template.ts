import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockTemplate = (hass: MockHomeAssistant) => {
  hass.mockAPI("template", () =>
    Promise.reject({
      body: { message: "Template dev tool does not work in the demo." },
    })
  );
};
