var EA = typeof EA !== 'undefined' ? EA : {};

EA.AutoMode = {
  enabled: false,

  init() {
    var self = this;
    return EA.Utils.storageGet([EA.StorageKeys.AUTO_MODE]).then(function (result) {
      self.enabled = !!result[EA.StorageKeys.AUTO_MODE];
    });
  },

  isEnabled() {
    return this.enabled;
  },

  toggle() {
    var self = this;
    var nextValue = !this.enabled;
    return EA.Utils.storageSet({ autoMode: nextValue }).then(function () {
      self.enabled = nextValue;
      return nextValue;
    });
  },

  getAutoNextDelay() {
    return EA.Utils.getRandomInt(800, 1500);
  },

  getAutoSettleDelay() {
    return EA.Utils.getRandomInt(250, 450);
  }
};
