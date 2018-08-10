export default superClass =>
  class extends superClass {
    ready() {
      super.ready();
      this.addEventListener('hass-more-info', e => this._handleMoreInfo(e));
    }

    _handleMoreInfo(ev) {
      this._updateHass({ moreInfoEntityId: ev.detail.entityId });
    }
  };
