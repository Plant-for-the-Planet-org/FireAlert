import React from 'react';
import {Switch as RNSwitch} from 'react-native-switch';

import {Colors} from '../../styles';

const toggleWidth = 28;
const circleSize = 16;
const switchWidthMultiplier = toggleWidth / circleSize;
const multiplierFix =
  circleSize / ((circleSize * switchWidthMultiplier - circleSize) / 2);

const Switch = ({value = false, onValueChange}) => (
  <RNSwitch
    value={value}
    onValueChange={onValueChange}
    disabled={false}
    activeText={'On'}
    inActiveText={'Off'}
    barHeight={9}
    circleSize={circleSize}
    switchLeftPx={multiplierFix}
    switchRightPx={multiplierFix}
    switchWidthMultiplier={switchWidthMultiplier}
    circleBorderWidth={3}
    backgroundActive={'#E5BFB7'}
    backgroundInactive={'#E0E0E076'}
    circleActiveColor={Colors.GRADIENT_PRIMARY}
    circleInActiveColor={'#E0E0E0'}
    changeValueImmediately={true} // if rendering inside circle, change state immediately or wait for animation to complete
    innerCircleStyle={{
      borderWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
    }} // style for inner animated circle for what you (may) be rendering inside the circle
    outerCircleStyle={{}} // style for outer animated circle
    renderActiveText={false}
    renderInActiveText={false}
    switchBorderRadius={30} // Sets the border Radius of the switch slider. If unset, it remains the circleSize.
  />
);

export default Switch;
