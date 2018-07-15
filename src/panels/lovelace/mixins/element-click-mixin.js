import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import NavigateMixin from '../../../mixins/navigate-mixin';
import toggleEntity from '../common/entity/toggle-entity.js';

/*
 * @polymerMixin
 * @appliesMixin NavigateMixin
 */
export default dedupingMixin(superClass =>
  class extends NavigateMixin(superClass) {
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
  });
