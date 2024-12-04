import {
  css,
  type CSSResultGroup,
  html,
  LitElement,
  type TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import type { LovelaceConfig } from "../../../../src/data/lovelace/config/types";
import { getPanelTitleFromUrlPath } from "../../../../src/data/panel";
import type { Lovelace } from "../../../../src/panels/lovelace/types";
import "../../../../src/panels/lovelace/views/hui-view";
import "../../../../src/panels/lovelace/views/hui-view-container";
import type { HomeAssistant } from "../../../../src/types";
import "./hc-launch-screen";
import "../../../../src/panels/lovelace/views/hui-view-background";

(window as any).loadCardHelpers = () =>
  import("../../../../src/panels/lovelace/custom-card-helpers");

@customElement("hc-lovelace")
class HcLovelace extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public lovelaceConfig!: LovelaceConfig;

  @property({ attribute: false }) public viewPath?: string | number | null;

  @property({ attribute: false }) public urlPath: string | null = null;

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
      showToast: () => undefined,
    };

    const viewConfig = this.lovelaceConfig.views[index];
    const background = viewConfig.background || this.lovelaceConfig.background;

    return html`
      <hui-view-container .hass=${this.hass} .theme=${viewConfig.theme}>
        <hui-view-background .background=${background}> </hui-view-background>
        <hui-view
          .hass=${this.hass}
          .lovelace=${lovelace}
          .index=${index}
        ></hui-view>
      </hui-view-container>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("viewPath") || changedProps.has("lovelaceConfig")) {
      const index = this._viewIndex;

      if (index !== undefined) {
        const title = getPanelTitleFromUrlPath(
          this.hass,
          this.urlPath || "lovelace"
        );

        const dashboardTitle = title || this.urlPath;

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
      }
    }
  }

  private get _viewIndex() {
    if (this.viewPath === null) {
      return 0;
    }
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
      hui-view-container {
        display: flex;
        position: relative;
        min-height: 100vh;
        box-sizing: border-box;
      }
      hui-view {
        flex: 1 1 100%;
        max-width: 100%;
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
