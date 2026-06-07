function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import React, { forwardRef, useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import { makeMutable, useAnimatedRef, useAnimatedStyle, useDerivedValue } from "react-native-reanimated";
import Reanimated from "react-native-reanimated";
import useCombinedRef from "../hooks/useCombinedRef";
import ScrollViewWithBottomPadding from "../ScrollViewWithBottomPadding";
import { useChatKeyboard } from "./useChatKeyboard";
import { useEndVisible } from "./useEndVisible";
import { useExtraContentPadding } from "./useExtraContentPadding";
const ZERO_CONTENT_PADDING = makeMutable(0);
const ZERO_BLANK_SPACE = makeMutable(0);
const KeyboardChatScrollView = /*#__PURE__*/forwardRef(({
  children,
  ScrollViewComponent = Reanimated.ScrollView,
  inverted = false,
  keyboardLiftBehavior = "always",
  freeze = false,
  offset = 0,
  extraContentPadding = ZERO_CONTENT_PADDING,
  blankSpace = ZERO_BLANK_SPACE,
  applyWorkaroundForContentInsetHitTestBug = false,
  onLayout: onLayoutProp,
  onContentSizeChange: onContentSizeChangeProp,
  onEndVisible,
  ...rest
}, ref) => {
  const scrollViewRef = useAnimatedRef();
  const onRef = useCombinedRef(ref, scrollViewRef);
  const freezeSV = useDerivedValue(() => typeof freeze === "boolean" ? freeze : freeze.value);
  const {
    padding,
    currentHeight,
    contentOffsetY,
    scroll,
    layout,
    size,
    onLayout: onLayoutInternal,
    onContentSizeChange: onContentSizeChangeInternal
  } = useChatKeyboard(scrollViewRef, {
    inverted,
    keyboardLiftBehavior,
    freeze: freezeSV,
    offset,
    blankSpace,
    extraContentPadding
  });
  useExtraContentPadding({
    scrollViewRef,
    extraContentPadding,
    keyboardPadding: padding,
    blankSpace,
    scroll,
    layout,
    size,
    contentOffsetY,
    inverted,
    keyboardLiftBehavior,
    freeze: freezeSV
  });
  useEndVisible({
    scroll,
    layout,
    size,
    inverted,
    onEndVisible
  });
  const totalPadding = useDerivedValue(() => Math.max(blankSpace.value, padding.value + extraContentPadding.value));

  // Scroll indicator inset = keyboard + extraContentPadding (excludes blankSpace).
  // Apps that render into the unsafe area can supply a negative
  // scrollIndicatorInsets adjustment at the application layer.
  const indicatorPadding = useDerivedValue(() => padding.value + extraContentPadding.value);
  const onLayout = useCallback(e => {
    onLayoutInternal(e);
    onLayoutProp === null || onLayoutProp === void 0 || onLayoutProp(e);
  }, [onLayoutInternal, onLayoutProp]);
  const onContentSizeChange = useCallback((w, h) => {
    onContentSizeChangeInternal(w, h);
    onContentSizeChangeProp === null || onContentSizeChangeProp === void 0 || onContentSizeChangeProp(w, h);
  }, [onContentSizeChangeInternal, onContentSizeChangeProp]);

  // Invisible view whose animated style changes every frame during keyboard
  // animation. On Fabric, this forces Reanimated to schedule a commit,
  // which flushes the scrollTo call in the same frame (fixing de-synchronization).
  // see https://github.com/software-mansion/react-native-reanimated/issues/9000
  const commitStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: -currentHeight.value
    }]
  }), []);
  const commit = useMemo(() => [styles.commitView, commitStyle], [commitStyle]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ScrollViewWithBottomPadding, _extends({
    ref: onRef
  }, rest, {
    applyWorkaroundForContentInsetHitTestBug: applyWorkaroundForContentInsetHitTestBug,
    bottomPadding: totalPadding,
    contentOffsetY: contentOffsetY,
    inverted: inverted,
    scrollIndicatorPadding: indicatorPadding,
    ScrollViewComponent: ScrollViewComponent,
    onContentSizeChange: onContentSizeChange,
    onLayout: onLayout
  }), children), /*#__PURE__*/React.createElement(Reanimated.View, {
    style: commit
  }));
});
const styles = StyleSheet.create({
  commitView: {
    display: "none",
    position: "absolute"
  }
});
export default KeyboardChatScrollView;
//# sourceMappingURL=index.js.map