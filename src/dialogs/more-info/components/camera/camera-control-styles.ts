import { css, html } from "lit";
import type { LocalizeFunc } from "../../../../common/translations/localize";

/** A quiet note under a camera control, like why it can't be used. */
export const cameraControlHintStyle = css`
  .hint {
    box-sizing: border-box;
    width: 100%;
    max-width: 360px;
    margin: 0 auto;
    padding: var(--ha-space-2) var(--ha-space-3);
    border-radius: var(--ha-border-radius-md);
    background-color: var(--ha-color-fill-neutral-quiet-resting);
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
    line-height: var(--ha-line-height-condensed);
    text-align: center;
  }

  .hint a {
    color: var(--primary-color);
  }
`;

/** Tells that some entities of the controls are disabled, and where to enable them. */
export const disabledEntitiesHint = (
  localize: LocalizeFunc,
  deviceId?: string
) => {
  const deviceSettings = localize(
    "ui.dialogs.more_info_control.camera.ptz.device_settings"
  );
  return localize("ui.dialogs.more_info_control.camera.ptz.disabled_entities", {
    device_settings: deviceId
      ? html`<a href=${`/config/devices/device/${deviceId}`}
          >${deviceSettings}</a
        >`
      : deviceSettings,
  });
};
