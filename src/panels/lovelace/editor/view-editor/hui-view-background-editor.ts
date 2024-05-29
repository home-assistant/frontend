import "@material/mwc-list/mwc-list-item";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-selector/ha-selector-image";
import { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { HomeAssistant, ValueChangedEvent } from "../../../../types";

const SELECTOR = { image: { original: true } };

@customElement("hui-view-background-editor")
export class HuiViewBackgroundEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: LovelaceViewConfig;

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const background = this._config?.background;
    const backgroundUrl =
      typeof background === "string"
        ? background.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1]
        : background?.image;

    return html`
      <ha-selector-image
        .hass=${this.hass}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.title"
        )}
        .value=${backgroundUrl}
        .selector=${SELECTOR}
        @value-changed=${this._backgroundChanged}
      ></ha-selector-image>
    `;
  }

  private _backgroundChanged(ev: ValueChangedEvent<string | null>) {
    const backgroundUrl = ev.detail.value;
    const config = {
      ...this._config,
      background: {
        ...(typeof this._config.background === "string"
          ? {}
          : this._config.background),
        image: backgroundUrl || undefined,
      },
    };
    fireEvent(this, "view-config-changed", { config });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background-editor": HuiViewBackgroundEditor;
  }
}
