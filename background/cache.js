var EA = typeof EA !== 'undefined' ? EA : {};

EA.Cache = {
  async get() {
    var res = await EA.Utils.storageGetLocal([EA.StorageKeys.AI_CACHE]);
    return res[EA.StorageKeys.AI_CACHE] || {};
  },

  async set(cache) {
    var item = {};
    item[EA.StorageKeys.AI_CACHE] = cache;
    await EA.Utils.storageSetLocal(item);
  }
};
