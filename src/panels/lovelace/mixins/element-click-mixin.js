import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import toggleEntity from "../common/entity/toggle-entity.js";
import NavigateMixin from "../../../mixins/navigate-mixin";
import EventsMixin from "../../../mixins/events-mixin.js";
import computeStateName from "../../../common/entity/compute_state_name";
import "@material/mwc-ripple";

/*
 * @polymerMixin
 * @appliesMixin EventsMixin
 * @appliesMixin NavigateMixin
 */
export default dedupingMixin(
  (superClass) =>
    class extends NavigateMixin(EventsMixin(superClass)) {
      registerMouse(config) {
        var isTouch =
          "ontouchstart" in window ||
          navigator.MaxTouchPoints > 0 ||
          navigator.msMaxTouchPoints > 0;

        let ripple = null;
        const rippleWrapper = document.createElement("div");
        this.parentElement.appendChild(rippleWrapper);
        Object.assign(rippleWrapper.style, {
          position: "absolute",
          width: isTouch ? "100px" : "50px",
          height: isTouch ? "100px" : "50px",
          top: this.style.top,
          left: this.style.left,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        });

        const loadRipple = () => {
          if (ripple) return;
          ripple = document.createElement("mwc-ripple");
          rippleWrapper.appendChild(ripple);
          ripple.unbounded = true;
          ripple.primary = true;
        };
        const startAnimation = () => {
          ripple.style.visibility = "visible";
          ripple.disabled = false;
          ripple.active = true;
        };
        const stopAnimation = () => {
          if (ripple) {
            ripple.active = false;
            ripple.disabled = true;
            ripple.style.visibility = "hidden";
          }
        };

        var mouseDown = isTouch ? "touchstart" : "mousedown";
        var mouseOut = isTouch ? "touchcancel" : "mouseout";
        var click = isTouch ? "touchend" : "click";

        var timer = null;
        var held = false;
        var holdTime = config.hold_time || 500;

        this.addEventListener(mouseDown, () => {
          held = false;
          loadRipple();
          timer = setTimeout(() => {
            startAnimation();
            held = true;
          }, holdTime);
        });

        this.addEventListener(click, () => {
          stopAnimation();
          this.handleClick(this.hass, config, held);
        });

        [
          mouseOut,
          "mouseup",
          "touchmove",
          "mousewheel",
          "wheel",
          "scroll",
        ].forEach((ev) => {
          document.addEventListener(ev, () => {
            clearTimeout(timer);
            stopAnimation();
          });
        });
      }

      handleClick(hass, config, held = false) {
        let tapAction = config.tap_action || "more-info";
        if (held) {
          tapAction = config.hold_action || "none";
        }
        if (tapAction === "none") return;

        switch (tapAction) {
          case "more-info":
            this.fire("hass-more-info", { entityId: config.entity });
            break;
          case "navigate":
            this.navigate(config.navigation_path);
            break;
          case "toggle":
            toggleEntity(hass, config.entity);
            break;
          case "call-service": {
            const [domain, service] = config.service.split(".", 2);
            const serviceData = Object.assign(
              {},
              { entity_id: config.entity },
              config.service_data
            );
            hass.callService(domain, service, serviceData);
          }
        }
      }

      computeTooltip(hass, config) {
        if (config.title) return config.title;

        const stateName =
          config.entity in hass.states
            ? computeStateName(hass.states[config.entity])
            : config.entity;

        let tooltip;
        switch (config.tap_action) {
          case "navigate":
            tooltip = `Navigate to ${config.navigation_path}`;
            break;
          case "toggle":
            tooltip = `Toggle ${stateName}`;
            break;
          case "call-service":
            tooltip = `Call service ${config.service}`;
            break;
          default:
            tooltip = `Show more-info: ${stateName}`;
        }

        return tooltip;
      }
    }
);
