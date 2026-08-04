import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from "lit/decorators";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../common/dom/fire_event";
import { popoverSupported } from "../common/feature-detect/support-popover";
import type { LocalizeKeys } from "../common/translations/localize";
import "../components/ha-button";
import "../components/ha-icon-button";
import "../components/ha-toast";
import type { ToastClosedEventDetail } from "../components/ha-toast";
import type { HomeAssistant } from "../types";

export interface ShowToastParams {
  // Unique ID for updating or closing a specific toast without flickering.
  id?: string;
  message:
    | string
    | { translationKey: LocalizeKeys; args?: Record<string, string | number> };
  announceMessage?:
    | string
    | { translationKey: LocalizeKeys; args?: Record<string, string | number> };
  action?: ToastActionParams;
  secondaryAction?: ToastActionParams;
  dismiss?: () => void;
  duration?: number;
  dismissable?: boolean;
  bottomOffset?: number;
}

export interface ToastActionParams {
  action: () => void;
  primary?: boolean;
  text:
    | string
    | { translationKey: LocalizeKeys; args?: Record<string, string | number> };
}

interface Notification {
  key: string;
  parameters: ShowToastParams;
}

@customElement("notification-manager")
class NotificationManager extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _notifications: Notification[] = [];

  @query(".stack") private _stack?: HTMLDivElement;

  @queryAll("ha-toast")
  private _toasts!: NodeListOf<HTMLElementTagNameMap["ha-toast"]>;

  private _anonymousId = 0;

  public async showDialog(parameters: ShowToastParams) {
    if (parameters.duration === 0) {
      if (parameters.id) {
        await this._closeNotification(`identified-${parameters.id}`);
      } else {
        const notification = [...this._notifications]
          .reverse()
          .find(({ parameters: { id } }) => !id);
        if (notification) {
          await this._closeNotification(notification.key);
        }
      }
      return;
    }

    const normalizedParameters = {
      ...parameters,
      duration:
        parameters.duration === undefined ||
        (parameters.duration > 0 && parameters.duration <= 4000)
          ? 4000
          : parameters.duration,
    };
    const key = parameters.id
      ? `identified-${parameters.id}`
      : `anonymous-${++this._anonymousId}`;
    const existingIndex = parameters.id
      ? this._notifications.findIndex(
          (notification) => notification.key === key
        )
      : -1;

    this._notifications =
      existingIndex === -1
        ? [...this._notifications, { key, parameters: normalizedParameters }]
        : this._notifications.map((notification, index) =>
            index === existingIndex
              ? { key, parameters: normalizedParameters }
              : notification
          );

    await this.updateComplete;
    this._showStack();
    this._getToast(key)?.show();
  }

  private _toastClosed(
    ev: HASSDomEvent<ToastClosedEventDetail> &
      HASSDomCurrentTargetEvent<HTMLElementTagNameMap["ha-toast"]>
  ) {
    const key = ev.currentTarget.dataset.notificationKey!;
    if (ev.detail.reason === "dismiss") {
      this._getNotification(key)?.parameters.dismiss?.();
    }
    this._removeNotification(key);
  }

  protected render() {
    if (!this._notifications.length) {
      return nothing;
    }
    return html`
      <div
        class="stack"
        popover=${ifDefined(popoverSupported ? "manual" : undefined)}
      >
        ${repeat(
          this._notifications,
          (notification) => notification.key,
          ({ key, parameters }) => html`
            <ha-toast
              data-notification-key=${key}
              style=${styleMap({
                marginBlockEnd: `${parameters.bottomOffset ?? 0}px`,
              })}
              .labelText=${
                typeof parameters.message !== "string"
                  ? this.hass.localize(
                      parameters.message.translationKey,
                      parameters.message.args
                    )
                  : parameters.message
              }
              .announceText=${
                parameters.announceMessage
                  ? typeof parameters.announceMessage !== "string"
                    ? this.hass.localize(
                        parameters.announceMessage.translationKey,
                        parameters.announceMessage.args
                      )
                    : parameters.announceMessage
                  : undefined
              }
              .timeoutMs=${parameters.duration!}
              .stacked=${true}
              @toast-closed=${this._toastClosed}
            >
              ${this._renderAction(key, parameters.secondaryAction, true)}
              ${this._renderAction(key, parameters.action, false)}
              ${
                parameters.dismissable
                  ? html`
                      <ha-icon-button
                        data-notification-key=${key}
                        .label=${this.hass.localize("ui.common.close")}
                        .path=${mdiClose}
                        slot="dismiss"
                        @click=${this._dismissClicked}
                      ></ha-icon-button>
                    `
                  : nothing
              }
            </ha-toast>
          `
        )}
      </div>
    `;
  }

  private _renderAction(
    key: string,
    action: ToastActionParams | undefined,
    secondary: boolean
  ) {
    if (!action) {
      return nothing;
    }
    return html`
      <ha-button
        data-notification-key=${key}
        appearance=${action.primary ? "filled" : "plain"}
        size="s"
        slot="action"
        @click=${secondary ? this._secondaryButtonClicked : this._buttonClicked}
      >
        ${
          typeof action.text !== "string"
            ? this.hass.localize(action.text.translationKey, action.text.args)
            : action.text
        }
      </ha-button>
    `;
  }

  private _buttonClicked(
    ev: HASSDomCurrentTargetEvent<HTMLElementTagNameMap["ha-button"]>
  ) {
    const key = ev.currentTarget.dataset.notificationKey!;
    this._getToast(key)?.hide("action");
    this._getNotification(key)?.parameters.action?.action();
  }

  private _secondaryButtonClicked(
    ev: HASSDomCurrentTargetEvent<HTMLElementTagNameMap["ha-button"]>
  ) {
    const key = ev.currentTarget.dataset.notificationKey!;
    this._getToast(key)?.hide("action");
    this._getNotification(key)?.parameters.secondaryAction?.action();
  }

  private _dismissClicked(
    ev: HASSDomCurrentTargetEvent<HTMLElementTagNameMap["ha-icon-button"]>
  ) {
    this._getToast(ev.currentTarget.dataset.notificationKey!)?.hide("dismiss");
  }

  private _getNotification(key: string) {
    return this._notifications.find((notification) => notification.key === key);
  }

  private _getToast(key: string) {
    return [...this._toasts].find(
      (toast) => toast.dataset.notificationKey === key
    );
  }

  private async _closeNotification(key: string) {
    const notification = this._getNotification(key);
    if (!notification) {
      return;
    }
    await this._getToast(key)?.hide();
    if (this._getNotification(key) === notification) {
      this._removeNotification(key);
    }
  }

  private _removeNotification(key: string) {
    this._notifications = this._notifications.filter(
      (notification) => notification.key !== key
    );
    if (!this._notifications.length) {
      this._hideStack();
    }
  }

  private _showStack() {
    if (!popoverSupported || this._stack?.matches(":popover-open")) {
      return;
    }
    this._stack?.showPopover();
  }

  private _hideStack() {
    if (!popoverSupported || !this._stack?.matches(":popover-open")) {
      return;
    }
    this._stack.hidePopover();
  }

  static override styles = css`
    .stack {
      position: fixed;
      inset: auto auto
        calc(var(--safe-area-inset-bottom, 0px) + var(--ha-space-4)) 50%;
      margin: 0;
      padding: 0;
      border: none;
      overflow: visible;
      background: transparent;
      transform: translateX(calc(-50% * var(--scale-direction)));
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-manager": NotificationManager;
  }

  // for fire event
  interface HASSDomEvents {
    "hass-notification": ShowToastParams;
  }
}
