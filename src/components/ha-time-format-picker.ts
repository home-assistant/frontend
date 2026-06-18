import memoizeOne from "memoize-one";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import "./ha-select";
import type { TimestampRenderingFormat } from "../panels/lovelace/components/types";
import { TIMESTAMP_RENDERING_FORMATS } from "../panels/lovelace/components/types";

@customElement("ha-time-format-picker")
export class HaTimeFormatPicker extends LitElement {
  @property() public value?: TimestampRenderingFormat;

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

  private _styleOptions = memoizeOne((localize: LocalizeFunc) => [
    { label: localize("ui.common.auto"), value: "auto" },
    {
      label: localize("ui.components.time-format-picker.styles.short"),
      value: "short",
    },
    {
      label: localize("ui.components.time-format-picker.styles.long"),
      value: "long",
    },
  ]);

  protected render() {
    const type = typeof this.value === "object" ? this.value.type : this.value;
    const style = typeof this.value === "object" ? this.value.style : undefined;
    return html`
      <div class="row">
        <ha-select
          .label=${this.label ?? ""}
          .value=${type || "auto"}
          .helper=${this.helper ?? ""}
          .disabled=${this.disabled}
          @selected=${this._selectChanged}
          .options=${this._options(this._localize)}
        >
        </ha-select>
        ${this.value
          ? html`
              <ha-select
                .label=${this._localize(
                  "ui.components.time-format-picker.style"
                )}
                .value=${style || "auto"}
                .disabled=${this.disabled}
                @selected=${this._styleChanged}
                .options=${this._styleOptions(this._localize)}
              >
              </ha-select>
            `
          : nothing}
      </div>
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
    if (this.value && typeof this.value === "object" && this.value.style) {
      fireEvent(this, "value-changed", {
        value: {
          type: ev.detail.value,
          style: this.value.style,
        },
      });
      return;
    }
    fireEvent(this, "value-changed", {
      value: ev.detail.value,
    });
  }

  private _styleChanged(ev) {
    ev.stopPropagation();
    const type = typeof this.value === "object" ? this.value.type : this.value;
    if (ev.detail?.value === "auto") {
      fireEvent(this, "value-changed", {
        value: type,
      });
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        type: type,
        style: ev.detail.value,
      },
    });
  }

  static styles = css`
    .row {
      display: flex;
      gap: 12px;
    }

    .row > * {
      flex: 1;
      min-width: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-time-format-picker": HaTimeFormatPicker;
  }
}
