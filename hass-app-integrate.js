/**
 * Home Assistant App Integration Library
 *
 * This library enables add-ons running in ingress iframes to communicate
 * with Home Assistant using postMessage.
 *
 * Usage:
 *   <script src="/local/hass-app-integrate.js"></script>
 *   <script>
 *     const hassApp = new HassAppIntegrate();
 *
 *     // Subscribe to property changes
 *     const unsubscribe = hassApp.subscribe(({ narrow, route }) => {
 *       if (narrow) {
 *         // Show mobile layout
 *       } else {
 *         // Show desktop layout
 *       }
 *     }, { hideToolbar: true });
 *
 *     // Navigate to a different page
 *     hassApp.navigate('/lovelace/dashboard');
 *
 *     // Toggle the sidebar menu
 *     hassApp.toggleMenu();
 *
 *     // Clean up when done
 *     unsubscribe();
 *   </script>
 */

(function () {
  "use strict";

  class HassAppIntegrate {
    constructor() {
      this._subscribeCallback = null;
      this._boundMessageHandler = this.handleMessage.bind(this);
      window.addEventListener("message", this._boundMessageHandler);
    }

    /**
     * Subscribe to property changes from Home Assistant
     * @param {Function} callback - Called with { narrow, route } when properties change
     * @param {Object} options - Options object
     * @param {boolean} options.hideToolbar - If true, Home Assistant hides its toolbar
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback, options = {}) {
      this._subscribeCallback = callback;

      // Send subscribe message to parent
      window.parent.postMessage(
        {
          type: "hass-app/subscribe",
          hideToolbar: options.hideToolbar || false,
        },
        "*"
      );

      // Return unsubscribe function
      return () => {
        this._subscribeCallback = null;
        window.parent.postMessage(
          {
            type: "hass-app/unsubscribe",
          },
          "*"
        );
      };
    }

    /**
     * Navigate to a different page in Home Assistant
     * @param {string} path - The path to navigate to (e.g., '/lovelace/dashboard')
     * @param {Object} options - Navigation options (replace, etc.)
     */
    navigate(path, options) {
      window.parent.postMessage(
        {
          type: "hass-app/navigate",
          path: path,
          options: options,
        },
        "*"
      );
    }

    /**
     * Toggle the Home Assistant sidebar menu
     */
    toggleMenu() {
      window.parent.postMessage(
        {
          type: "hass-app/toggle-menu",
        },
        "*"
      );
    }

    /**
     * Clean up event listeners
     */
    destroy() {
      window.removeEventListener("message", this._boundMessageHandler);
      this._subscribeCallback = null;
    }

    /**
     * Handle messages from Home Assistant
     * @private
     */
    handleMessage(event) {
      // Only process messages from parent window
      if (event.source !== window.parent) {
        return;
      }

      const { type, ...data } = event.data;

      if (type === "hass-app/properties" && this._subscribeCallback) {
        this._subscribeCallback({
          narrow: data.narrow,
          route: data.route,
        });
      }
    }
  }

  // Export for use in modules and global scope
  if (typeof module !== "undefined" && module.exports) {
    module.exports = HassAppIntegrate;
  }
  if (typeof window !== "undefined") {
    window.HassAppIntegrate = HassAppIntegrate;
  }
})();
