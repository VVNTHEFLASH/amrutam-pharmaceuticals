const storage = {};
const AsyncStorageMock = {
  setItem: async (key, val) => {
    storage[key] = val;
  },
  getItem: async (key) => storage[key] || null,
  removeItem: async (key) => {
    delete storage[key];
  },
};

module.exports = AsyncStorageMock;
module.exports.default = AsyncStorageMock;

