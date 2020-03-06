import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  CSSResult,
  css,
  property,
} from "lit-element";
import { LovelaceConfig } from "../../../../src/data/lovelace";
import "../../../../src/panels/lovelace/views/hui-view";
import "../../../../src/panels/lovelace/views/hui-panel-view";
import { HomeAssistant } from "../../../../src/types";
import { Lovelace } from "../../../../src/panels/lovelace/types";
import "./hc-launch-screen";

@customElement("hc-lovelace")
class HcLovelace extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public lovelaceConfig!: LovelaceConfig;

  @property() public viewPath?: string | number;

  protected render(): TemplateResult {
    const index = this._viewIndex;
    if (index === undefined) {
      return html`
        <hc-launch-screen
          .hass=${this.hass}
          .error=${`Unable to find a view with path ${this.viewPath}`}
        ></hc-launch-screen>
      `;
    }
    const lovelace: Lovelace = {
      config: this.lovelaceConfig,
      editMode: false,
      enableFullEditMode: () => undefined,
      mode: "storage",
      language: "en",
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
    };
    return this.lovelaceConfig.views[index].panel
      ? html`
          <hui-panel-view
            .hass=${this.hass}
            .config=${this.lovelaceConfig.views[index]}
          ></hui-panel-view>
        `
      : html`
          <hui-view
            .hass=${this.hass}
            .lovelace=${lovelace}
            .index=${index}
            columns="2"
          ></hui-view>
        `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("viewPath") || changedProps.has("lovelaceConfig")) {
      const index = this._viewIndex;

      if (index !== undefined) {
        const configBackground =
          this.lovelaceConfig.views[index].background ||
          this.lovelaceConfig.background;

        if (configBackground) {
          (this.shadowRoot!.querySelector(
            "hui-view, hui-panel-view"
          ) as HTMLElement)!.style.setProperty(
            "--lovelace-background",
            configBackground
          );
        }
      }
    }
  }

  private get _viewIndex() {
    const selectedView = this.viewPath;
    const selectedViewInt = parseInt(selectedView as string, 10);
    for (let i = 0; i < this.lovelaceConfig.views.length; i++) {
      if (
        this.lovelaceConfig.views[i].path === selectedView ||
        i === selectedViewInt
      ) {
        return i;
      }
    }
    return undefined;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background: var(--primary-background-color);
      }
      :host > * {
        flex: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-lovelace": HcLovelace;
  }
}
