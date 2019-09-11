import HassBaseMixin from "./hass-base-mixin";
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
import { LitElement } from "lit-element";

const ext = <T>(baseClass: T, mixins): T =>
  mixins.reduceRight((base, mixin) => mixin(base), baseClass);

export class HassElement extends ext(HassBaseMixin(LitElement), [
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
