import Polymer from '../polymer';

export default new Polymer({
  is: 'more-info-camera',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  imageLoaded() {
    this.fire('iron-resize');
  },

  computeCameraImageUrl(stateObj) {
    if (__DEMO__) {
      return '/demo/webcam.jpg';
    } else if (stateObj) {
      return `/api/camera_proxy_stream/${stateObj.entityId}` +
             `?token=${stateObj.attributes.access_token}`;
    }
    // Return an empty image if no stateObj (= dialog not open)
    return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  },
});
