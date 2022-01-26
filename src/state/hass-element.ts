import { Constructor } from "../types";
import AuthMixin from "./auth-mixin";
import { connectionMixin } from "./connection-mixin";
import { dialogManagerMixin } from "./dialog-manager-mixin";
import DisconnectToastMixin from "./disconnect-toast-mixin";
import { hapticMixin } from "./haptic-mixin";
import { HassBaseEl } from "./hass-base-mixin";
import { loggingMixin } from "./logging-mixin";
import MoreInfoMixin from "./more-info-mixin";
import NotificationMixin from "./notification-mixin";
import { panelTitleMixin } from "./panel-title-mixin";
import SidebarMixin from "./sidebar-mixin";
import ThemesMixin from "./themes-mixin";
import TranslationsMixin from "./translations-mixin";
import { urlSyncMixin } from "./url-sync-mixin";

const ext = <T extends Constructor>(baseClass: T, mixins): T =>
  mixins.reduceRight((base, mixin) => mixin(base), baseClass);

export class HassElement extends ext(HassBaseEl, [
  AuthMixin,
  ThemesMixin,
  TranslationsMixin,
  MoreInfoMixin,
  SidebarMixin,
  DisconnectToastMixin,
  connectionMixin,
  NotificationMixin,
  dialogManagerMixin,
  urlSyncMixin,
  hapticMixin,
  panelTitleMixin,
  loggingMixin,
]) {}
