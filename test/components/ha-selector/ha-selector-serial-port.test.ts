import { afterEach, describe, expect, it, vi } from "vitest";
import type { HaSerialPortSelector } from "../../../src/components/ha-selector/ha-selector-serial-port";
import type { HomeAssistant } from "../../../src/types";
import "../../../src/components/ha-selector/ha-selector-serial-port";

vi.mock("../../../src/components/ha-combo-box-item", () => {
  customElements.define("ha-combo-box-item", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-generic-picker", () => {
  customElements.define("ha-generic-picker", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-svg-icon", () => {
  customElements.define("ha-svg-icon", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-icon-button", () => {
  customElements.define("ha-icon-button", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/input/ha-input", () => {
  customElements.define("ha-input", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-picker-combo-box", () => {
  customElements.define("ha-picker-combo-box", class extends HTMLElement {});
  return { DEFAULT_SEARCH_KEYS: [] };
});

vi.mock("../../../src/data/usb", () => ({
  listSerialPorts: () =>
    Promise.resolve([
      {
        device: "/dev/ttyUSB0",
        resolved_device: null,
        serial_number: null,
        manufacturer: null,
        description: null,
        matching_integrations: [],
        present: true,
      },
    ]),
}));

const hass = {
  localize: (key: string) => key,
  locale: { language: "en" },
  config: { components: ["usb"] },
  user: { is_admin: true },
  devices: {},
  areas: {},
} as unknown as HomeAssistant;

const NETWORK_ENTRY_ID = "__network_entry__";

const flush = async (selector: HaSerialPortSelector) => {
  await selector.updateComplete;
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await selector.updateComplete;
};

const mountSelector = async (value?: string) => {
  const selector = document.createElement(
    "ha-selector-serial_port"
  ) as HaSerialPortSelector;
  selector.hass = hass;
  selector.selector = { serial_port: {} };
  selector.value = value;
  document.body.append(selector);
  await flush(selector);
  return selector;
};

const pickNetworkEntry = async (selector: HaSerialPortSelector) => {
  selector
    .shadowRoot!.querySelector("ha-generic-picker")!
    .dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: NETWORK_ENTRY_ID } })
    );
  await flush(selector);
};

const fields = (selector: HaSerialPortSelector) =>
  Array.from(
    selector.shadowRoot!.querySelectorAll<HTMLElement & { value: string }>(
      "ha-input"
    )
  );

const typeInto = async (
  selector: HaSerialPortSelector,
  index: number,
  value: string
) => {
  const field = fields(selector)[index];
  field.value = value;
  field.dispatchEvent(new Event("input"));
  await selector.updateComplete;
};

const recordValues = (selector: HaSerialPortSelector) => {
  const values: (string | undefined)[] = [];
  selector.addEventListener("value-changed", (ev) => {
    values.push((ev as CustomEvent).detail.value);
  });
  return values;
};

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("ha-selector-serial_port network entry", () => {
  it("composes a socket URL once both fields are filled", async () => {
    const selector = await mountSelector();
    await pickNetworkEntry(selector);
    const values = recordValues(selector);

    await typeInto(selector, 0, "192.168.1.50");
    await typeInto(selector, 1, "502");

    expect(values).toEqual([undefined, "socket://192.168.1.50:502"]);
  });

  it("clears the value when a field is emptied, rather than emitting half a URL", async () => {
    const selector = await mountSelector();
    await pickNetworkEntry(selector);
    await typeInto(selector, 0, "192.168.1.50");
    await typeInto(selector, 1, "502");
    const values = recordValues(selector);

    await typeInto(selector, 0, "");

    expect(values).toEqual([undefined]);
  });

  // Guards the round trip between SOCKET_URL and the URL the fields compose:
  // a reconfigure flow has to reopen an already configured port for editing.
  it("fills the fields from a socket URL that is already the value", async () => {
    const selector = await mountSelector("socket://10.0.0.7:8899");
    const values = recordValues(selector);

    await pickNetworkEntry(selector);

    expect(fields(selector).map((field) => field.value)).toEqual([
      "10.0.0.7",
      "8899",
    ]);
    expect(values).toEqual(["socket://10.0.0.7:8899"]);
  });

  it("leaves the fields empty for a value that is not a socket URL", async () => {
    const selector = await mountSelector("/dev/ttyUSB0");

    await pickNetworkEntry(selector);

    expect(fields(selector).map((field) => field.value)).toEqual(["", ""]);
  });
});
