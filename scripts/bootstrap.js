const Module = require('module');
const path = require('path');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  if (request === 'react-native') {
    return path.join(__dirname, 'mock-react-native.js');
  }
  if (request === '@react-native-async-storage/async-storage') {
    return path.join(__dirname, 'mock-async-storage.js');
  }
  if (request === '@react-native-community/netinfo') {
    return path.join(__dirname, 'mock-netinfo.js');
  }
  return originalResolve.apply(this, arguments);
};

// Execute the test script
require('./verify_offline_sync.ts');
