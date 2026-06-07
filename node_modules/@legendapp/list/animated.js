'use strict';

var reactNative = require('react-native');
var list = require('@legendapp/list');

// src/integrations/animated.tsx
var AnimatedLegendList = reactNative.Animated.createAnimatedComponent(list.LegendList);

exports.AnimatedLegendList = AnimatedLegendList;
