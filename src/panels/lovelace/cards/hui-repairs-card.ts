import { mdiWrench } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import { ConnectionSubscriptionController } from "../../../data/connection-subscription-controller";
import { configContext } from "../../../data/context";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { RepairsIssue } from "../../../data/repairs";
import { subscribeRepairsIssueRegistry } from "../../../data/repairs";
import type { CurrentUser, HomeAssistantConfig } from "../../../types";
import { hasAction } from "../common/has-action";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { RepairsCardConfig } from "./types";

@customElement("hui-repairs-card")
export class HuiRepairsCard extends LitElement implements LovelaceCard {
  public connectedWhileHidden = true;

  @state() private _config?: RepairsCardConfig;

  @state() private _repairsIssues?: RepairsIssue[];

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, CurrentUser | undefined>({
    transformer: ({ user }) => user,
  })
  private _user?: CurrentUser;

  constructor() {
    super();
    new ConnectionSubscriptionController(this, {
      subscribe: (connection) =>
        subscribeRepairsIssueRegistry(connection, (repairs) => {
          // Filter to only non-ignored issues
          this._repairsIssues = repairs.issues.filter(
            (issue) => !issue.ignored
          );
        }),
    });
  }

  public setConfig(config: RepairsCardConfig): void {
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
      navigate("/config/repairs");
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

    // Update visibility based on admin status and repairs count
    const shouldBeHidden = Boolean(
      !this._user?.is_admin ||
      (this._config.hide_empty &&
        this._repairsIssues &&
        this._repairsIssues.length === 0)
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

    const count = Array.isArray(this._repairsIssues)
      ? this._repairsIssues.length
      : 0;

    const label = this._localize("ui.card.repairs.title");
    const secondary =
      count > 0
        ? this._localize("ui.card.repairs.count_issues", {
            count,
          })
        : this._localize("ui.card.repairs.no_issues");
    const secondaryLoading = !this._repairsIssues;

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
          <ha-tile-icon slot="icon" .iconPath=${mdiWrench}></ha-tile-icon>
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
        --tile-color: var(--warning-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-repairs-card": HuiRepairsCard;
  }
}
