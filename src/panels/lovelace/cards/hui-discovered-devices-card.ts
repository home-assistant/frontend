import { mdiDevices } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import {
  DISCOVERY_SOURCES,
  subscribeConfigFlowInProgress,
  type ConfigFlowInProgressMessage,
} from "../../../data/config_flow";
import { ConnectionSubscriptionController } from "../../../data/connection-subscription-controller";
import {
  configContext,
  internationalizationContext,
} from "../../../data/context";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { showAddIntegrationDialog } from "../../config/integrations/show-add-integration-dialog";
import type {
  CurrentUser,
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../../../types";
import { hasAction } from "../common/has-action";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { DiscoveredDevicesCardConfig } from "./types";

@customElement("hui-discovered-devices-card")
export class HuiDiscoveredDevicesCard
  extends LitElement
  implements LovelaceCard
{
  public connectedWhileHidden = true;

  @state() private _config?: DiscoveredDevicesCardConfig;

  @state() private _discoveredFlows?: DataEntryFlowProgress[];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, CurrentUser | undefined>({
    transformer: ({ user }) => user,
  })
  private _user?: CurrentUser;

  constructor() {
    super();
    new ConnectionSubscriptionController(this, {
      enabled: () => Boolean(this._user?.is_admin),
      subscribe: (connection) =>
        subscribeConfigFlowInProgress({ connection }, (messages) =>
          this._handleFlowMessages(messages)
        ),
    });
  }

  private _handleFlowMessages(messages: ConfigFlowInProgressMessage[]) {
    if (messages.length === 0) {
      this._discoveredFlows = [];
      return;
    }

    let fullUpdate = false;
    const newFlows: DataEntryFlowProgress[] = [];

    messages.forEach((message) => {
      if (message.type === "removed") {
        const flows = Array.isArray(this._discoveredFlows)
          ? this._discoveredFlows
          : [];
        this._discoveredFlows = flows.filter(
          (flow) => flow.flow_id !== message.flow_id
        );
        return;
      }

      if (message.type === null || message.type === "added") {
        if (message.type === null) {
          fullUpdate = true;
        }
        // Only include flows from discovery sources
        if (DISCOVERY_SOURCES.includes(message.flow.context.source)) {
          newFlows.push(message.flow);
        }
      }
    });

    if (!newFlows.length && !fullUpdate) {
      return;
    }

    const existingFlows =
      fullUpdate || !Array.isArray(this._discoveredFlows)
        ? []
        : this._discoveredFlows;
    this._discoveredFlows = [...existingFlows, ...newFlows];
  }

  public setConfig(config: DiscoveredDevicesCardConfig): void {
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
      await this._i18n.loadFragmentTranslation("config");
      showAddIntegrationDialog(this, { brand: "_discovered" });
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

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this._config) {
      return;
    }

    // Update visibility based on admin status and discovered devices count
    const shouldBeHidden = Boolean(
      !this._user?.is_admin ||
      (this._config.hide_empty &&
        this._discoveredFlows &&
        this._discoveredFlows.length === 0)
    );

    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || this.hidden) {
      return nothing;
    }

    const count = Array.isArray(this._discoveredFlows)
      ? this._discoveredFlows.length
      : 0;

    const label = this._i18n.localize("ui.card.discovered-devices.title");
    const secondary =
      count > 0
        ? this._i18n.localize("ui.card.discovered-devices.count_devices", {
            count,
          })
        : this._i18n.localize("ui.card.discovered-devices.no_devices");
    const secondaryLoading = !this._discoveredFlows;

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
          <ha-tile-icon slot="icon" .iconPath=${mdiDevices}></ha-tile-icon>
          <ha-tile-info
            slot="info"
            .primary=${label}
            .secondary=${secondary}
            .secondaryLoading=${secondaryLoading}
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
    "hui-discovered-devices-card": HuiDiscoveredDevicesCard;
  }
}
