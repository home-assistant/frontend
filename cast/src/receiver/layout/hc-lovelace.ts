import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { LovelaceConfig } from "../../../../src/data/lovelace";
import { Lovelace } from "../../../../src/panels/lovelace/types";
import "../../../../src/panels/lovelace/views/hui-view";
import { HomeAssistant } from "../../../../src/types";
import "./hc-launch-screen";

(window as any).loadCardHelpers = () =>
  import("../../../../src/panels/lovelace/custom-card-helpers");

@customElement("hc-lovelace")
class HcLovelace extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelaceConfig!: LovelaceConfig;

  @property() public viewPath?: string | number;

  @property() public urlPath: string | null = null;

  @query("hui-view") private _huiView?: HTMLElement;

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
      rawConfig: this.lovelaceConfig,
      editMode: false,
      urlPath: this.urlPath,
      enableFullEditMode: () => undefined,
      mode: "storage",
      locale: this.hass.locale,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
    };
    return html`
      <hui-view
        .hass=${this.hass}
        .lovelace=${lovelace}
        .index=${index}
      ></hui-view>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("viewPath") || changedProps.has("lovelaceConfig")) {
      const index = this._viewIndex;

      if (index !== undefined) {
        const dashboardTitle = this.lovelaceConfig.title || this.urlPath;

        const viewTitle =
          this.lovelaceConfig.views[index].title ||
          this.lovelaceConfig.views[index].path;

        fireEvent(this, "cast-view-changed", {
          title:
            dashboardTitle || viewTitle
              ? `${dashboardTitle || ""}${
                  dashboardTitle && viewTitle ? ": " : ""
                }${viewTitle || ""}`
              : undefined,
        });

        const configBackground =
          this.lovelaceConfig.views[index].background ||
          this.lovelaceConfig.background;

        if (configBackground) {
          this._huiView!.style.setProperty(
            "--lovelace-background",
            configBackground
          );
        } else {
          this._huiView!.style.removeProperty("--lovelace-background");
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        min-height: 100vh;
        height: 0;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background: var(--primary-background-color);
      }
      :host > * {
        flex: 1;
      }
      hui-view {
        background: var(--lovelace-background, var(--primary-background-color));
      }
    `;
  }
}

export interface CastViewChanged {
  title: string | undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-lovelace": HcLovelace;
  }
  interface HASSDomEvents {
    "cast-view-changed": CastViewChanged;
  }
}
