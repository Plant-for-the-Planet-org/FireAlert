import * as React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';

function UserPlaceholder(props) {
  return (
    <Svg
      width={32}
      height={32}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Circle
        cx={16}
        cy={16}
        r={15.619}
        fill="#828282"
        stroke="#fff"
        strokeWidth={0.761905}
      />
      <Path
        d="M16 17a5 5 0 100-10 5 5 0 000 10zM8 22.625v-.743C8 19.755 9.57 18 11.539 18h8.923C22.4 18 24 19.721 24 21.882v.742C21.877 24.718 19.077 26 16 26s-5.876-1.283-8-3.375z"
        fill="#F2F2F2"
      />
    </Svg>
  );
}

export default UserPlaceholder;
