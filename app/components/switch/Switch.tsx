import React from 'react';
import {Switch as RNSwitch} from 'react-native-switch';

import {Colors} from '../../styles';

const Switch = ({value = false, onValueChange}) => (
  <RNSwitch
    value={value}
    onValueChange={onValueChange}
    disabled={false}
    activeText={'On'}
    inActiveText={'Off'}
    circleSize={25}
    barHeight={14}
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
    switchLeftPx={2} // denominator for logic when sliding to TRUE position. Higher number = more space from RIGHT of the circle to END of the slider
    switchRightPx={2} // denominator for logic when sliding to FALSE position. Higher number = more space from LEFT of the circle to BEGINNING of the slider
    switchWidthMultiplier={2} // multiplied by the `circleSize` prop to calculate total width of the Switch
    switchBorderRadius={30} // Sets the border Radius of the switch slider. If unset, it remains the circleSize.
  />
);

export default Switch;
