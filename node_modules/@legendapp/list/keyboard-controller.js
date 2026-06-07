'use strict';

var React = require('react');
var reactNative = require('react-native');
var reactNativeKeyboardController = require('react-native-keyboard-controller');
var reactNativeReanimated = require('react-native-reanimated');
var list = require('@legendapp/list');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var React__namespace = /*#__PURE__*/_interopNamespace(React);

// src/integrations/keyboard-controller.tsx
var typedForwardRef = React.forwardRef;
var LegendList = typedForwardRef(function LegendList2(props, forwardedRef) {
  const {
    LegendList: LegendListProp,
    contentContainerStyle: contentContainerStyleProp,
    scrollIndicatorInsets: scrollIndicatorInsetsProp,
    ...rest
  } = props;
  const [padding, setPadding] = React.useState(0);
  const updatePadding = (height) => {
    setPadding(height);
  };
  reactNativeKeyboardController.useKeyboardHandler({
    onEnd: (e) => {
      "worklet";
      reactNativeReanimated.runOnJS(updatePadding)(e.height);
    }
  });
  const LegendListComponent = LegendListProp != null ? LegendListProp : list.LegendList;
  const contentContainerStyleFlattened = reactNative.StyleSheet.flatten(contentContainerStyleProp) || {};
  const contentContainerStyle = { ...contentContainerStyleFlattened, paddingTop: padding };
  const scrollIndicatorInsets = scrollIndicatorInsetsProp ? { ...scrollIndicatorInsetsProp } : {};
  if (!props.horizontal) {
    scrollIndicatorInsets.top = ((scrollIndicatorInsets == null ? void 0 : scrollIndicatorInsets.top) || 0) + padding;
  }
  return (
    // @ts-expect-error TODO: Fix this type
    /* @__PURE__ */ React__namespace.createElement(
      LegendListComponent,
      {
        ...rest,
        contentContainerStyle,
        ref: forwardedRef,
        scrollIndicatorInsets
      }
    )
  );
});

exports.LegendList = LegendList;
