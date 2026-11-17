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
import {
  getTopOpenModal,
  subscribeOpenModals,
} from "../common/dom/modal-stack";
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

  // Where the dialog manager put this element, to return to when no modal is
  // open
  private _homeParent?: ParentNode;

  private _moving = false;

  private _followScheduled = false;

  private _unsubscribeOpenModals?: () => void;

  // The element that had focus before it moved into a toast, to return focus
  // to when that toast closes
  private _focusReturnTarget?: HTMLElement;

  private _focusRoot?: Node;

  public connectedCallback(): void {
    super.connectedCallback();
    // A focus event isn't delivered where the element losing focus and the
    // one gaining it retarget to the same element, so it never reaches the
    // window when focus moves into a toast. On this element's root node, both
    // are still apart: everything in the page or modal this element is in
    // passes through it.
    this._focusRoot = this.getRootNode();
    this._focusRoot.addEventListener("focusout", this._trackFocusOut, true);
    this._unsubscribeOpenModals?.();
    this._unsubscribeOpenModals = subscribeOpenModals(this._scheduleFollow);
    if (this._moving) {
      // Moving closed the stack popover. Reopen it so it's on top of the
      // modal it moved into.
      if (this._notifications.length) {
        this._showStack();
      }
      return;
    }
    this._homeParent = this.parentNode ?? undefined;
    this._scheduleFollow();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._focusRoot?.removeEventListener("focusout", this._trackFocusOut, true);
    this._focusRoot = undefined;
    this._unsubscribeOpenModals?.();
    this._unsubscribeOpenModals = undefined;
  }

  // A modal can close while it's being removed from the page, with this
  // element inside. Move once all connect and disconnect callbacks of that
  // removal ran, still before the next paint.
  private _scheduleFollow = () => {
    if (this._followScheduled) {
      return;
    }
    this._followScheduled = true;
    queueMicrotask(() => {
      this._followScheduled = false;
      this._followTopModal();
    });
  };

  // While a modal is open, the browser makes everything outside it inert, so
  // toast buttons only work from inside the topmost modal.
  private _followTopModal() {
    const topModal = getTopOpenModal();
    const target = topModal ?? this._homeParent;
    if (!target || this.parentNode === target) {
      return;
    }
    this._moving = true;
    try {
      if (topModal) {
        this.slot = "toast-host";
      } else {
        this.removeAttribute("slot");
      }
      target.appendChild(this);
    } finally {
      this._moving = false;
    }
  }

  private _trackFocusOut = (ev: Event) => {
    const path = ev.composedPath();
    if (path.includes(this)) {
      return;
    }
    // Without a related target, focus went nowhere, so there is nothing to
    // return to
    this._focusReturnTarget =
      (ev as FocusEvent).relatedTarget && path[0] instanceof HTMLElement
        ? path[0]
        : undefined;
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
    const toast = ev.currentTarget;
    const key = toast.dataset.notificationKey!;
    if (ev.detail.reason === "dismiss") {
      this._getNotification(key)?.parameters.dismiss?.();
    }
    const activeElement = this.shadowRoot!.activeElement;
    const hadFocus = activeElement !== null && toast.contains(activeElement);
    this._removeNotification(key);
    if (hadFocus) {
      this._returnFocus();
    }
  }

  private async _returnFocus() {
    const target = this._focusReturnTarget;
    await this.updateComplete;
    if (target?.isConnected) {
      target.focus();
    }
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
    return html`
      <div
        class="stack"
        style=${styleMap({
          "--notification-stack-bottom-offset": `${bottomOffset}px`,
        })}
        popover=${ifDefined(popoverSupported ? "manual" : undefined)}
      >
        ${repeat(
          this._notifications,
          (notification) => notification.key,
          ({ key, parameters }) => html`
            <ha-toast
              data-notification-key=${key}
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
