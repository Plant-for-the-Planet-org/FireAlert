import React from 'react';
import Svg, {Text, Path} from 'react-native-svg';

function MarkerSVG({point, color, opacity = 1, ...props}) {
  return (
    <Svg
      width={24}
      height={75}
      viewBox="0 0 24 75"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.373 0 0 5.373 0 12c0 6.242 4.766 11.371 10.857 11.947v12.625a1.143 1.143 0 002.286 0V23.947C19.234 23.37 24 18.242 24 12c0-6.627-5.373-12-12-12z"
        fill="#E86F56"
      />
      <Path d="M3.288 11.824a8.5 8.5 0 1117 0 8.5 8.5 0 01-17 0z" fill="#fff" />
      <Text
        fill="black"
        fontSize="12"
        x="12"
        y="16"
        textAnchor="middle"
        fontWeight="bold">
        {point}
      </Text>
      <Path
        opacity={0.3}
        d="M12 38.858c-1.578 0-2.857-.64-2.857-1.429s1.279-1.428 2.857-1.428c1.578 0 2.857.64 2.857 1.428 0 .79-1.28 1.429-2.857 1.429z"
        fill="#E86F56"
      />
    </Svg>
  );
}

export default MarkerSVG;
