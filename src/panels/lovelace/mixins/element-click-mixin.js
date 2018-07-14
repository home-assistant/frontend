import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import EventsMixin from '../../../mixins/events-mixin';
import toggleEntity from '../common/entity/toggle-entity.js';

/*
 * @polymerMixin
 * @appliesMixin EventsMixin
 */
export default dedupingMixin(superClass =>
  class extends EventsMixin(superClass) {
    handleClick() {
      const tapAction = this._config.tap_action || 'more-info';

      switch (tapAction) {
        case 'more-info':
          this.fire('hass-more-info', { entityId: this._config.entity });
          break;
        case 'toggle':
          toggleEntity(this.hass, this._config.entity);
          break;
        case 'call-service': {
          const [domain, service] = this._config.service.split('.', 2);
          const serviceData = Object.assign(
            {}, { entity_id: this._config.entity },
            this._config.service_data
          );
          this.hass.callService(domain, service, serviceData);
        }
      }
    }
  });
