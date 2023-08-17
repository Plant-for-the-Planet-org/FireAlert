import * as React from 'react';
import Svg, {Rect, G, Path, Defs, ClipPath} from 'react-native-svg';

function PasteIcon(props) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Rect width={22} height={22} rx={4} fill="#fff" />
      <Rect width={22} height={22} rx={4} fill="#E86F56" fillOpacity={0.07} />
      <G clipPath="url(#clip0_1231_10162)" fill="#E86F56">
        <Path d="M5 8.155v8.313c0 .404.165.794.455 1.082.292.287.688.45 1.102.45h5.778c.411 0 .807-.163 1.1-.448.291-.287.454-.677.454-1.082v-5.65l-.13-.13-4-3.937-.132-.128H6.554c-.411 0-.807.162-1.1.447A1.53 1.53 0 005 8.155zm1.112 0a.436.436 0 01.445-.437h2.446v2.187c0 .405.165.795.454 1.083.292.287.688.447 1.1.447h2.222v5.03a.436.436 0 01-.444.438H6.557a.45.45 0 01-.315-.128.431.431 0 01-.13-.31v-8.31z" />
        <Path d="M15.446 15.375c.411 0 .808-.162 1.1-.447.292-.288.454-.678.454-1.083V5.53a1.53 1.53 0 00-.454-1.083 1.578 1.578 0 00-1.1-.447H9.668c-.411 0-.807.162-1.1.447a1.521 1.521 0 00-.457 1.083v.22h1.885l4.782 4.707v4.918h.668z" />
      </G>
      <Rect
        x={0.5}
        y={0.5}
        width={21}
        height={21}
        rx={3.5}
        stroke="#E86F56"
        strokeOpacity={0.1}
      />
      <Defs>
        <ClipPath id="clip0_1231_10162">
          <Path fill="#fff" transform="translate(5 4)" d="M0 0H12V14H0z" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

export default PasteIcon;
