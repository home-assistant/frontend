import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import toggleEntity from '../common/entity/toggle-entity.js';
import NavigateMixin from '../../../mixins/navigate-mixin';
import EventsMixin from '../../../mixins/events-mixin.js';

/*
 * @polymerMixin
 * @appliesMixin EventsMixin
 * @appliesMixin NavigateMixin
 */
export default dedupingMixin(superClass =>
  class extends NavigateMixin(EventsMixin(superClass)) {
    handleClick(hass, config) {
      const tapAction = config.tap_action || 'more-info';

      switch (tapAction) {
        case 'more-info':
          this.fire('hass-more-info', { entityId: config.entity });
          break;
        case 'navigate':
          this.navigate(config.navigation_path);
          break;
        case 'toggle':
          toggleEntity(this.hass, config.entity);
          break;
        case 'call-service': {
          const [domain, service] = config.service.split('.', 2);
          const serviceData = Object.assign(
            {}, { entity_id: config.entity },
            config.service_data
          );
          hass.callService(domain, service, serviceData);
        }
      }
    }

    computeTooltip(config) {
      if (config.title) return config.title;

      let tooltip;
      switch (config.tap_action) {
        case 'navigate':
          tooltip = `Navigate to ${config.navigation_path}`;
          break;
        case 'toggle':
          tooltip = `Toggle ${config.entity}`;
          break;
        case 'call-service':
          tooltip = `Call service ${config.service}`;
          break;
        default:
          tooltip = 'Show more-info';
      }

      return tooltip;
    }
  });
