import { customElement, property, state } from "lit/decorators";
import { css, html, LitElement } from "lit";
import memoizeOne from "memoize-one";

import { fireEvent } from "../../../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../../../types";
import { InclusionStrategy } from "../../../../../../data/zwave_js";
import type { LocalizeFunc } from "../../../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../../../components/ha-form/types";

import "../../../../../../components/ha-form/ha-form";

@customElement("zwave-js-add-node-select-security-strategy")
export class ZWaveJsAddNodeSelectMethod extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() public _inclusionStrategy?: InclusionStrategy;

  private _getSchema = memoizeOne((localize: LocalizeFunc): HaFormSchema[] => [
    {
      name: "strategy",
      required: true,
      selector: {
        select: {
          box_max_columns: 1,
          mode: "box",
          options: [
            {
              value: InclusionStrategy.Default.toString(),
              label: localize(
                "ui.panel.config.zwave_js.add_node.select_strategy.default_label"
              ),
              description: localize(
                "ui.panel.config.zwave_js.add_node.select_strategy.default_description"
              ),
            },
            {
              value: InclusionStrategy.Security_S0.toString(),
              label: localize(
                "ui.panel.config.zwave_js.add_node.select_strategy.s0_label"
              ),
              description: localize(
                "ui.panel.config.zwave_js.add_node.select_strategy.s0_description"
              ),
            },
            {
              value: InclusionStrategy.Insecure.toString(),
              label: localize(
                "ui.panel.config.zwave_js.add_node.select_strategy.insecure_label"
              ),
              description: localize(
                "ui.panel.config.zwave_js.add_node.select_strategy.insecure_description"
              ),
            },
          ],
        },
      },
    },
  ]);

  render() {
    return html`
      <ha-form
        .schema=${this._getSchema(this.hass.localize)}
        .data=${{ strategy: this._inclusionStrategy?.toString() }}
        @value-changed=${this._selectStrategy}
        .computeLabel=${this._computeLabel}
      >
      </ha-form>
    `;
  }

  private _computeLabel = () =>
    this.hass.localize(
      "ui.panel.config.zwave_js.add_node.select_strategy.title"
    );

  private _selectStrategy(event: any) {
    const selectedStrategy = Number(
      event.detail.value.strategy
    ) as InclusionStrategy;
    fireEvent(this, "z-wave-strategy-selected", {
      strategy: selectedStrategy,
    });
  }

  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    ha-md-list {
      padding: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-select-security-strategy": ZWaveJsAddNodeSelectMethod;
  }
  interface HASSDomEvents {
    "z-wave-strategy-selected": {
      strategy: InclusionStrategy;
    };
  }
}
