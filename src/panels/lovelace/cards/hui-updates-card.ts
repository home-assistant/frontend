import { mdiPackageUp } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import {
  filterUpdateEntities,
  updateCanInstall,
  type UpdateEntity,
} from "../../../data/update";
import type { HomeAssistant } from "../../../types";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { UpdatesCardConfig } from "./types";

@customElement("hui-updates-card")
export class HuiUpdatesCard extends LitElement implements LovelaceCard {
  public connectedWhileHidden = true;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: UpdatesCardConfig;

  public setConfig(config: UpdatesCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    return this._config?.vertical ? 2 : 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    const columns = 6;
    let min_columns = 6;
    let rows = 1;

    if (this._config?.vertical) {
      rows++;
      min_columns = 3;
    }
    return {
      columns,
      rows,
      min_columns,
      min_rows: rows,
    };
  }

  private _getUpdateEntities(): UpdateEntity[] {
    if (!this.hass) {
      return [];
    }
    return filterUpdateEntities(
      this.hass.states,
      this.hass.locale.language
    ).filter((entity) => updateCanInstall(entity, false));
  }

  private async _handleAction(ev: ActionHandlerEvent) {
    if (ev.detail.action === "tap" && !hasAction(this._config?.tap_action)) {
      navigate("/config/updates");
      return;
    }
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private get _hasCardAction() {
    return (
      !this._config?.tap_action ||
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this._config || !this.hass) {
      return;
    }

    const updateEntities = this._getUpdateEntities();

    // Update visibility based on admin status and updates count
    const shouldBeHidden =
      !this.hass.user?.is_admin ||
      (this._config.hide_empty && updateEntities.length === 0);

    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass || this.hidden) {
      return nothing;
    }

    const updateEntities = this._getUpdateEntities();
    const count = updateEntities.length;

    const label = this.hass.localize("ui.card.updates.title");
    const secondary =
      count > 0
        ? this.hass.localize("ui.card.updates.count_updates", {
            count,
          })
        : this.hass.localize("ui.card.updates.no_updates");

    return html`
      <ha-card>
        <ha-tile-container
          .vertical=${Boolean(this._config.vertical)}
          .interactive=${this._hasCardAction}
          .actionHandlerOptions=${{
            hasHold: hasAction(this._config!.hold_action),
            hasDoubleClick: hasAction(this._config!.double_tap_action),
          }}
          @action=${this._handleAction}
        >
          <ha-tile-icon slot="icon" .iconPath=${mdiPackageUp}></ha-tile-icon>
          <ha-tile-info
            slot="info"
            .primary=${label}
            .secondary=${secondary}
          ></ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  static styles = [
    tileCardStyle,
    css`
      :host {
        --tile-color: var(--info-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-updates-card": HuiUpdatesCard;
  }
}
