import AuthMixin from "./auth-mixin";
import TranslationsMixin from "./translations-mixin";
import ThemesMixin from "./themes-mixin";
import MoreInfoMixin from "./more-info-mixin";
import ZHADialogMixin from "./zha-dialog-mixin";
import SidebarMixin from "./sidebar-mixin";
import { dialogManagerMixin } from "./dialog-manager-mixin";
import { connectionMixin } from "./connection-mixin";
import NotificationMixin from "./notification-mixin";
import DisconnectToastMixin from "./disconnect-toast-mixin";
import { hapticMixin } from "./haptic-mixin";
import { urlSyncMixin } from "./url-sync-mixin";
import { Constructor } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

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
  ZHADialogMixin,
  hapticMixin,
]) {}
