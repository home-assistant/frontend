import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/skeletons/skeleton-card-tile";
import type { HaFormSchema } from "../../../components/ha-form/types";
import type { HomeAssistant } from "../../../types";
import type {
  LovelaceCard,
  LovelaceConfigForm,
  LovelaceGridOptions,
} from "../types";
import type { SkeletonCardConfig } from "./types";

const SCHEMA = [
  {
    name: "mode",
    selector: {
      select: {
        mode: "dropdown",
        options: ["tile"],
      },
    },
  },
] as const satisfies readonly HaFormSchema[];

@customElement("hui-skeleton-card")
export class HuiSkeletonCard extends LitElement implements LovelaceCard {
  public static getConfigForm(): LovelaceConfigForm {
    return {
      schema: [...SCHEMA],
      computeLabel: (schema, localize) =>
        schema.name === "mode"
          ? localize("ui.panel.lovelace.editor.card.skeleton.mode")
          : undefined,
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  private _config?: SkeletonCardConfig;

  public getCardSize(): number {
    switch (this._config?.mode ?? "tile") {
      case "tile":
      default:
        return 1;
    }
  }

  public getGridOptions(): LovelaceGridOptions {
    switch (this._config?.mode ?? "tile") {
      case "tile":
      default:
        return {
          columns: 6,
          rows: 1,
          min_columns: 6,
          min_rows: 1,
        };
    }
  }

  public setConfig(config: SkeletonCardConfig): void {
    this._config = {
      mode: "tile",
      ...config,
    };
  }

  protected render() {
    return html`
      <ha-card>
        <ha-skeleton-tile></ha-skeleton-tile>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    ha-card {
      height: 100%;
      padding: var(--ha-space-2);
      height: 100%;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-skeleton-card": HuiSkeletonCard;
  }
}
