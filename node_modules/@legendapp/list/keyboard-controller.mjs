import * as React from 'react';
import { useState, forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { runOnJS } from 'react-native-reanimated';
import { LegendList as LegendList$1 } from '@legendapp/list';

// src/integrations/keyboard-controller.tsx
var typedForwardRef = forwardRef;
var LegendList = typedForwardRef(function LegendList2(props, forwardedRef) {
  const {
    LegendList: LegendListProp,
    contentContainerStyle: contentContainerStyleProp,
    scrollIndicatorInsets: scrollIndicatorInsetsProp,
    ...rest
  } = props;
  const [padding, setPadding] = useState(0);
  const updatePadding = (height) => {
    setPadding(height);
  };
  useKeyboardHandler({
    onEnd: (e) => {
      "worklet";
      runOnJS(updatePadding)(e.height);
    }
  });
  const LegendListComponent = LegendListProp != null ? LegendListProp : LegendList$1;
  const contentContainerStyleFlattened = StyleSheet.flatten(contentContainerStyleProp) || {};
  const contentContainerStyle = { ...contentContainerStyleFlattened, paddingTop: padding };
  const scrollIndicatorInsets = scrollIndicatorInsetsProp ? { ...scrollIndicatorInsetsProp } : {};
  if (!props.horizontal) {
    scrollIndicatorInsets.top = ((scrollIndicatorInsets == null ? void 0 : scrollIndicatorInsets.top) || 0) + padding;
  }
  return (
    // @ts-expect-error TODO: Fix this type
    /* @__PURE__ */ React.createElement(
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

export { LegendList };
