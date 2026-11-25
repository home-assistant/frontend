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
import { getTopModal, subscribeOpenModals } from "../common/dom/open-modals";
import { stopKeydownEnterSpacePropagation } from "../common/dom/stop_propagation";
import { popoverSupported } from "../common/feature-detect/support-popover";
import type { LocalizeKeys } from "../common/translations/localize";
import "../components/ha-button";
import "../components/ha-icon-button";
import "../components/ha-toast";
import type { ToastClosedEventDetail } from "../components/ha-toast";
import type { HomeAssistant } from "../types";

export type ToastText =
  | string
  | { translationKey: LocalizeKeys; args?: Record<string, string | number> };

export interface ShowToastParams {
  // Unique ID for updating or closing a specific toast without flickering.
  id?: string;
  message: ToastText;
  supportingText?: ToastText;
  announceMessage?: ToastText;
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
  icon?: string;
  keepOpen?: boolean;
  text: ToastText;
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

  private _home?: ParentNode;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._home) {
      return;
    }
    this._home = this.parentNode!;
    subscribeOpenModals(this._modalsChanged);
    this._modalsChanged();
  }

  // A dialog reports that it opens before it enters the top layer. Wait, so
  // that the stack enters the top layer after the dialog and paints above it.
  private _modalsChanged = () => {
    queueMicrotask(this._moveToTopModal);
  };

  // A modal dialog makes everything outside it inert, so the toasts must be
  // inside the topmost one for their buttons to work.
  private _moveToTopModal = () => {
    const parent = getTopModal() ?? this._home!;
    if (this.parentNode !== parent) {
      parent.appendChild(this);
    }
    // Also when staying, as a bottom sheet that reopens itself enters the top
    // layer again above the stack.
    this._showStack();
  };

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
    const bottomOffset = Math.max(
      ...this._notifications.map(
        ({ parameters }) => parameters.bottomOffset ?? 0
      )
    );
    // Inside a dialog, Enter on a toast button would otherwise also reach
    // dialogs that submit on Enter, like the one to add a user.
    return html`
      <div
        class="stack"
        style=${styleMap({
          "--notification-stack-bottom-offset": `${bottomOffset}px`,
        })}
        popover=${ifDefined(popoverSupported ? "manual" : undefined)}
        @keydown=${stopKeydownEnterSpacePropagation}
        @keypress=${stopKeydownEnterSpacePropagation}
      >
        ${repeat(
          this._notifications,
          (notification) => notification.key,
          ({ key, parameters }) => html`
            <ha-toast
              data-notification-key=${key}
              .labelText=${this._localizeText(parameters.message)}
              .supportingText=${this._localizeText(parameters.supportingText)}
              .announceText=${this._localizeText(parameters.announceMessage)}
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
    const onClick = secondary
      ? this._secondaryButtonClicked
      : this._buttonClicked;
    if (action.icon) {
      return html`
        <ha-icon-button
          data-notification-key=${key}
          .label=${this._localizeText(action.text)}
          .path=${action.icon}
          slot="action"
          @click=${onClick}
        ></ha-icon-button>
      `;
    }
    return html`
      <ha-button
        data-notification-key=${key}
        appearance=${action.primary ? "filled" : "plain"}
        size="s"
        slot="action"
        @click=${onClick}
      >
        ${this._localizeText(action.text)}
      </ha-button>
    `;
  }

  private _localizeText(text: ToastText): string;

  private _localizeText(text: ToastText | undefined): string | undefined;

  private _localizeText(text: ToastText | undefined) {
    return typeof text === "object"
      ? this.hass.localize(text.translationKey, text.args)
      : text;
  }

  private _buttonClicked(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    const key = ev.currentTarget.dataset.notificationKey!;
    this._runAction(key, this._getNotification(key)?.parameters.action);
  }

  private _secondaryButtonClicked(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    const key = ev.currentTarget.dataset.notificationKey!;
    this._runAction(
      key,
      this._getNotification(key)?.parameters.secondaryAction
    );
  }

  private _runAction(key: string, action: ToastActionParams | undefined) {
    if (!action?.keepOpen) {
      this._getToast(key)?.hide("action");
    }
    action?.action();
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
    if (!popoverSupported || !this._stack) {
      return;
    }
    // Top-layer order is order of entry — re-enter so we paint above any
    // dialog backdrop opened since the stack was first shown.
    if (this._stack.matches(":popover-open")) {
      this._stack.hidePopover();
    }
    this._stack.showPopover();
  }

  private _hideStack() {
    if (!popoverSupported || !this._stack?.matches(":popover-open")) {
      return;
    }
    this._stack.hidePopover();
  }

  static override styles = css`
    :host {
      /* No box, so the manager does not change the layout of a dialog. */
      display: contents;
    }
    .stack {
      position: fixed;
      inset-block-start: auto;
      inset-inline-end: auto;
      inset-block-end: calc(
        var(--safe-area-inset-bottom, 0px) + var(--ha-space-4) +
          var(--notification-stack-bottom-offset, 0px)
      );
      inset-inline-start: 50%;
      margin: 0;
      padding: 0;
      border: none;
      overflow: visible;
      background: transparent;
      transform: translateX(
        calc(
          -50% * var(--scale-direction) +
            var(--safe-area-offset-left, 0px) - var(
              --safe-area-offset-right,
              0px
            )
        )
      );
      max-width: var(--safe-width);
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
