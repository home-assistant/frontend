import Polymer from '../polymer';

export default new Polymer({
  is: 'more-info-camera',

  properties: {
    stateObj: {
      type: Object,
    },
    dialogOpen: {
      type: Boolean,
    },
  },

  imageLoaded() {
    this.fire('iron-resize');
  },

  computeCameraImageUrl(dialogOpen) {
    if (__DEMO__) {
      return '/demo/webcam.jpg';
    } else if (dialogOpen) {
      return '/api/camera_proxy_stream/' + this.stateObj.entityId;
    }
    // Return an empty image if dialog is not open
    return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  },
});
