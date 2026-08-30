module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(sition)?|expo-router|@expo/ui)',
  ],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest-css-mock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
};
