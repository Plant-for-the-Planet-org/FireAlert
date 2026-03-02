import React from 'react';
import {Svg, Path} from 'react-native-svg';

export const CalendarActiveIcon = ({width = 16, height = 16}) => (
  <Svg width={width} height={height} viewBox="0 0 15 17" fill="none">
    <Path
      d="M4.49999 0.75V3M10.5 0.75V3M1.125 6.06749H13.875M14.25 5.62499V12C14.25 14.25 13.125 15.75 10.5 15.75H4.49999C1.875 15.75 0.75 14.25 0.75 12V5.62499C0.75 3.375 1.875 1.875 4.49999 1.875H10.5C13.125 1.875 14.25 3.375 14.25 5.62499Z"
      stroke="#E86F56"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10.7398 9.75H10.7483M10.7398 12.5833H10.7483M7.24539 9.75H7.25483M7.24539 12.5833H7.25483M3.75 9.75H3.75944M3.75 12.5833H3.75944"
      stroke="#E86F56"
      strokeWidth="1.88889"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
