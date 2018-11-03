import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "./ha-icon";

class HaLabelBadge extends PolymerElement {
  static get template() {
    return html`
    <style>
    .badge-container {
      display: inline-block;
      text-align: center;
      vertical-align: top;
    }
    .label-badge {
      position: relative;
      display: block;
      margin: 0 auto;
      width: var(--ha-label-badge-size, 2.5em);
      text-align: center;
      height: var(--ha-label-badge-size, 2.5em);
      line-height: var(--ha-label-badge-size, 2.5em);
      font-size: var(--ha-label-badge-font-size, 1.5em);
      border-radius: 50%;
      border: 0.1em solid var(--ha-label-badge-color, var(--primary-color));
      color: var(--label-badge-text-color, rgb(76, 76, 76));

      white-space: nowrap;
      background-color: var(--label-badge-background-color, white);
      background-size: cover;
      transition: border .3s ease-in-out;
    }
    .label-badge .value {
      font-size: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label-badge .value.big {
      font-size: 70%;
    }
    .label-badge .label {
      position: absolute;
      bottom: -1em;
      /* Make the label as wide as container+border. (parent_borderwidth / font-size) */
      left: -0.2em;
      right: -0.2em;
      line-height: 1em;
      font-size: 0.5em;
    }
    .label-badge .label span {
      box-sizing: border-box;
      max-width: 100%;
      display: inline-block;
      background-color: var(--ha-label-badge-color, var(--primary-color));
      color: var(--ha-label-badge-label-color, white);
      border-radius: 1em;
      padding: 9% 16% 8% 16%; /* mostly apitalized text, not much descenders => bit more top margin */
      font-weight: 500;
      overflow: hidden;
      text-transform: uppercase;
      text-overflow: ellipsis;
      transition: background-color .3s ease-in-out;
      text-transform: var(--ha-label-badge-label-text-transform, uppercase);
    }
    .label-badge .label.big span {
      font-size: 90%;
      padding: 10% 12% 7% 12%; /* push smaller text a bit down to center vertically */
    }
    .badge-container .title {
      margin-top: 1em;
      font-size: var(--ha-label-badge-title-font-size, .9em);
      width: var(--ha-label-badge-title-width, 5em);
      font-weight: var(--ha-label-badge-title-font-weight, 400);
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: normal;
    }

    [hidden] {
      display: none !important;
    }
    </style>

    <div class="badge-container">
      <div class="label-badge" id="badge">
        <div class$="[[computeValueClasses(value)]]">
          <ha-icon icon="[[icon]]" hidden$="[[computeHideIcon(icon, value, image)]]"></ha-icon>
          <span hidden$="[[computeHideValue(value, image)]]">[[value]]</span>
        </div>
        <div hidden$="[[computeHideLabel(label)]]" class$="[[computeLabelClasses(label)]]">
          <span>[[label]]</span>
        </div>
      </div>
      <div class="title" hidden$="[[!description]]">[[description]]</div>
    </div>
`;
  }

  static get properties() {
    return {
      value: String,
      icon: String,
      label: String,
      description: String,

      image: {
        type: String,
        observer: "imageChanged",
      },
    };
  }

  computeValueClasses(value) {
    return value && value.length > 4 ? "value big" : "value";
  }

  computeLabelClasses(label) {
    return label && label.length > 5 ? "label big" : "label";
  }

  computeHideLabel(label) {
    return !label || !label.trim();
  }

  computeHideIcon(icon, value, image) {
    return !icon || value || image;
  }

  computeHideValue(value, image) {
    return !value || image;
  }

  imageChanged(newVal) {
    this.$.badge.style.backgroundImage = newVal ? "url(" + newVal + ")" : "";
  }
}
customElements.define("ha-label-badge", HaLabelBadge);
