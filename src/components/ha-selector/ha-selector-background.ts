import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { BackgroundSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-picture-upload";
import "../ha-alert";
import type { HaPictureUpload } from "../ha-picture-upload";
import { URL_PREFIX } from "../../data/image_upload";

@customElement("ha-selector-background")
export class HaBackgroundSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public value?: any;

  @property({ attribute: false }) public selector!: BackgroundSelector;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private yamlBackground = false;

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("value")) {
      this.yamlBackground = !!this.value && !this.value.startsWith(URL_PREFIX);
    }
  }

  protected render() {
    return html`
      <div>
        ${this.yamlBackground
          ? html`
              <ha-alert alert-type="info">
                ${this.hass.localize(
                  `ui.components.selectors.background.yaml_info`
                )}
                <ha-button slot="action" @click=${this._clearValue}>
                  ${this.hass.localize(
                    `ui.components.picture-upload.clear_picture`
                  )}
                </ha-button>
              </ha-alert>
            `
          : html`
              <ha-picture-upload
                .hass=${this.hass}
                .value=${this.value?.startsWith(URL_PREFIX) ? this.value : null}
                .original=${this.selector.background?.original}
                .cropOptions=${this.selector.background?.crop}
                select-media
                @change=${this._pictureChanged}
              ></ha-picture-upload>
            `}
      </div>
    `;
  }

  private _pictureChanged(ev) {
    const value = (ev.target as HaPictureUpload).value;

    fireEvent(this, "value-changed", { value: value ?? undefined });
  }

  private _clearValue() {
    fireEvent(this, "value-changed", { value: undefined });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        position: relative;
      }
      div {
        display: flex;
        flex-direction: column;
      }
      ha-button {
        white-space: nowrap;
        --mdc-theme-primary: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-background": HaBackgroundSelector;
  }
}
