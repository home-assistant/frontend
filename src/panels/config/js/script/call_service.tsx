import { h } from "preact";
import "../../../../components/ha-service-picker";
import "../../../../components/entity/ha-entity-picker";

import YAMLTextArea from "../yaml_textarea";
import { AutomationComponent } from "../automation-component";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeObjectId } from "../../../../common/entity/compute_object_id";
import memoizeOne from "memoize-one";

export default class CallServiceAction extends AutomationComponent<any> {
  private _getServiceData = memoizeOne((service: string) => {
    if (!service) {
      return [];
    }
    const domain = computeDomain(service);
    const serviceName = computeObjectId(service);
    const serviceDomains = this.props.hass.services;
    if (!(domain in serviceDomains)) {
      return [];
    }
    if (!(serviceName in serviceDomains[domain])) {
      return [];
    }

    const fields = serviceDomains[domain][serviceName].fields;
    return Object.keys(fields).map((field) => {
      return { key: field, ...fields[field] };
    });
  });

  constructor() {
    super();

    this.serviceChanged = this.serviceChanged.bind(this);
    this.entityChanged = this.entityChanged.bind(this);
    this.serviceDataChanged = this.serviceDataChanged.bind(this);
  }

  public serviceChanged(ev) {
    if (!this.initialized) {
      return;
    }
    const newAction = {
      ...this.props.action,
      service: ev.target.value,
    };
    if (
      computeDomain(this.props.action.service) !==
      computeDomain(ev.target.value)
    ) {
      delete newAction.entity_id;
    }
    this.props.onChange(this.props.index, newAction);
  }

  public entityChanged(ev) {
    if (!this.initialized) {
      return;
    }
    this.props.onChange(this.props.index, {
      ...this.props.action,
      entity_id: ev.target.value,
    });
  }

  public serviceDataChanged(data) {
    if (!this.initialized) {
      return;
    }
    this.props.onChange(this.props.index, { ...this.props.action, data });
  }

  public render({ action, hass, localize }) {
    const { service, data, entity_id } = action;
    const serviceData = this._getServiceData(service);
    const entity = serviceData.find((attr) => attr.key === "entity_id");

    return (
      <div>
        <ha-service-picker
          hass={hass}
          value={service}
          onChange={this.serviceChanged}
        />
        {entity && (
          <ha-entity-picker
            hass={hass}
            value={entity_id}
            label={entity.description}
            onChange={this.entityChanged}
            includeDomains={[computeDomain(service)]}
            allow-custom-entity
          />
        )}
        <YAMLTextArea
          label={localize(
            "ui.panel.config.automation.editor.actions.type.service.service_data"
          )}
          value={data}
          onChange={this.serviceDataChanged}
        />
      </div>
    );
  }
}

(CallServiceAction as any).defaultConfig = {
  alias: "",
  service: "",
  data: {},
};
