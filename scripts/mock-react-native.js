const ReactNativeMock = {
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  StyleSheet: { create: (obj) => obj },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  FlatList: 'FlatList',
};

module.exports = ReactNativeMock;
module.exports.default = ReactNativeMock;

