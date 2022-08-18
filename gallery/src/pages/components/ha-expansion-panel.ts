import { mdiPacMan } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-expansion-panel";
import "../../../../src/components/ha-markdown";
import "../../components/demo-black-white-row";
import { LONG_TEXT } from "../../data/text";

const SHORT_TEXT = LONG_TEXT.substring(0, 113);

const SAMPLES: {
  template: (slot: string, leftChevron: boolean) => TemplateResult;
}[] = [
  {
    template(slot, leftChevron) {
      return html`
        <ha-expansion-panel
          slot=${slot}
          .leftChevron=${leftChevron}
          header="Attr header"
        >
          ${SHORT_TEXT}
        </ha-expansion-panel>
      `;
    },
  },
  {
    template(slot, leftChevron) {
      return html`
        <ha-expansion-panel
          slot=${slot}
          .leftChevron=${leftChevron}
          header="Attr header"
          secondary="Attr secondary"
        >
          ${SHORT_TEXT}
        </ha-expansion-panel>
      `;
    },
  },
  {
    template(slot, leftChevron) {
      return html`
        <ha-expansion-panel
          slot=${slot}
          .leftChevron=${leftChevron}
          .header=${"Prop header"}
        >
          ${SHORT_TEXT}
        </ha-expansion-panel>
      `;
    },
  },
  {
    template(slot, leftChevron) {
      return html`
        <ha-expansion-panel
          slot=${slot}
          .leftChevron=${leftChevron}
          .header=${"Prop header"}
          .secondary=${"Prop secondary"}
        >
          ${SHORT_TEXT}
        </ha-expansion-panel>
      `;
    },
  },
  {
    template(slot, leftChevron) {
      return html`
        <ha-expansion-panel
          slot=${slot}
          .leftChevron=${leftChevron}
          .header=${"Prop header"}
        >
          <span slot="secondary">Slot Secondary</span>
          ${SHORT_TEXT}
        </ha-expansion-panel>
      `;
    },
  },
  {
    template(slot, leftChevron) {
      return html`
        <ha-expansion-panel slot=${slot} .leftChevron=${leftChevron}>
          <span slot="header">Slot header</span>
          ${SHORT_TEXT}
        </ha-expansion-panel>
      `;
    },
  },
  {
    template(slot, leftChevron) {
      return html`
        <ha-expansion-panel slot=${slot} .leftChevron=${leftChevron}>
          <span slot="header">Slot header with actions</span>
          <ha-icon-button
            slot="icons"
            label="Some Action"
            .path=${mdiPacMan}
          ></ha-icon-button>
          ${SHORT_TEXT}
        </ha-expansion-panel>
      `;
    },
  },
  {
    template(slot, leftChevron) {
      return html`
        <ha-expansion-panel
          slot=${slot}
          .leftChevron=${leftChevron}
          header="Attr Header with actions"
        >
          <ha-icon-button
            slot="icons"
            label="Some Action"
            .path=${mdiPacMan}
          ></ha-icon-button>
          ${SHORT_TEXT}
        </ha-expansion-panel>
      `;
    },
  },
];

@customElement("demo-components-ha-expansion-panel")
export class DemoHaExpansionPanel extends LitElement {
  protected render(): TemplateResult {
    return html`
      ${SAMPLES.map(
        (sample) => html`
          <demo-black-white-row>
            ${["light", "dark"].map((slot) =>
              sample.template(slot, slot === "dark")
            )}
          </demo-black-white-row>
        `
      )}
    `;
  }

  static get styles() {
    return css`
      ha-expansion-panel {
        margin: -16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-expansion-panel": DemoHaExpansionPanel;
  }
}
