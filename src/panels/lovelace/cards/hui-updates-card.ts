import { mdiPackageUp } from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import {
  configContext,
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../../../data/context";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { filterUpdateEntities, updateCanInstall } from "../../../data/update";
import type {
  CurrentUser,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../../../types";
import { hasAction } from "../common/has-action";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { UpdatesCardConfig } from "./types";

@customElement("hui-updates-card")
export class HuiUpdatesCard extends LitElement implements LovelaceCard {
  public connectedWhileHidden = true;

  @state() private _config?: UpdatesCardConfig;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, CurrentUser | undefined>({
    transformer: ({ user }) => user,
  })
  private _user?: CurrentUser;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, number>({
    transformer: function (this: HuiUpdatesCard, states) {
      if (!this._formatters) {
        return undefined;
      }
      return filterUpdateEntities(
        states,
        this._formatters.formatEntityName,
        this._i18n?.locale.language
      ).filter((entity) => updateCanInstall(entity, false)).length;
    },
    watch: ["_i18n", "_formatters"],
  })
  private _updateCount?: number;

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

  private async _handleAction(ev: ActionHandlerEvent) {
    if (ev.detail.action === "tap" && !hasAction(this._config?.tap_action)) {
      navigate("/config/updates");
      return;
    }
    fireEvent(this, "hass-action", {
      config: this._config!,
      action: ev.detail.action,
    });
  }

  private get _hasCardAction() {
    return (
      !this._config?.tap_action ||
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  // Runs after @transform has refreshed _updateCount, which happens after
  // willUpdate.
  protected update(changedProps: PropertyValues): void {
    if (this._config) {
      this._updateVisibility();
    }
    super.update(changedProps);
  }

  private _updateVisibility(): void {
    // Update visibility based on admin status and updates count
    const shouldBeHidden = Boolean(
      !this._user?.is_admin || (this._config!.hide_empty && !this._updateCount)
    );

    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this._i18n) {
      return nothing;
    }

    const count = this._updateCount ?? 0;

    const label = this._i18n.localize("ui.card.updates.title");
    const secondary =
      count > 0
        ? this._i18n.localize("ui.card.updates.count_updates", {
            count,
          })
        : this._i18n.localize("ui.card.updates.no_updates");

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
