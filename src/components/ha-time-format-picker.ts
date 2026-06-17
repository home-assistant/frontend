import memoizeOne from "memoize-one";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import "./ha-select";
import { TIMESTAMP_RENDERING_FORMATS } from "../panels/lovelace/components/types";

@customElement("ha-time-format-picker")
export class HaTimeFormatPicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  private _options = memoizeOne((localize: LocalizeFunc) =>
    [{ label: localize("ui.common.auto"), value: "auto" }].concat(
      TIMESTAMP_RENDERING_FORMATS.map((format) => ({
        label:
          localize(`ui.components.time-format-picker.formats.${format}`) ||
          format,
        value: format,
      }))
    )
  );

  protected render() {
    return html`
      <ha-select
        .label=${this.label ?? ""}
        .value=${this.value || "auto"}
        .helper=${this.helper ?? ""}
        .disabled=${this.disabled}
        @selected=${this._selectChanged}
        .options=${this._options(this._localize)}
      >
      </ha-select>
    `;
  }

  private _selectChanged(ev) {
    ev.stopPropagation();
    if (ev.detail?.value === "auto" && this.value !== undefined) {
      fireEvent(this, "value-changed", {
        value: undefined,
      });
      return;
    }
    fireEvent(this, "value-changed", {
      value: ev.detail.value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-time-format-picker": HaTimeFormatPicker;
  }
}
