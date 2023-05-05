import * as React from 'react';
import Svg, {Circle, G, Path, Defs, ClipPath} from 'react-native-svg';

function MyLocIcon(props) {
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
        fill="#fff"
        stroke="#fff"
        strokeWidth={0.761905}
      />
      <G clipPath="url(#clip0_979_9855)" fill="#333">
        <Path d="M23 15h-1.09A5.991 5.991 0 0017 10.09V8.972A.97.97 0 0016.028 8C15.504 8 15 8.448 15 8.972v1.118A5.99 5.99 0 0010.09 15H8.972a.988.988 0 00-.972.972c0 .525.448 1.028.972 1.028h1.09c.45 2.512 2.426 4.488 4.938 4.91V23a.97.97 0 00.972.972c.525 0 1.028-.419 1.028-.972v-1.09A5.99 5.99 0 0021.91 17H23a1 1 0 100-2zm-7 5c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.788 4-4 4z" />
        <Path d="M16 13.25a2.75 2.75 0 100 5.5 2.75 2.75 0 000-5.5z" />
      </G>
      <Defs>
        <ClipPath id="clip0_979_9855">
          <Path fill="#fff" transform="translate(8 8)" d="M0 0H16V16H0z" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

export default MyLocIcon;
