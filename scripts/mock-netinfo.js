const NetInfoMock = {
  fetch: async () => ({ isConnected: true }),
  addEventListener: () => () => {},
};

module.exports = NetInfoMock;
module.exports.default = NetInfoMock;

