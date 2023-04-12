import * as React from 'react';
import Svg, {G, Path, Defs, ClipPath} from 'react-native-svg';

function PhoneIcon(props) {
  return (
    <Svg
      width={13}
      height={21}
      viewBox="0 0 13 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <G clipPath="url(#clip0_848_10806)">
        <Path
          d="M6.997 16.228c.412 0 .784.161 1.05.421a1.393 1.393 0 010 2.025l-.032.027c-.266.243-.624.39-1.018.39-.408 0-.78-.16-1.05-.42s-.437-.62-.437-1.013c0-.393.167-.752.437-1.012.27-.257.639-.418 1.05-.418zm.387 1.06a.551.551 0 00-.387-.153.551.551 0 00-.387.154.513.513 0 000 .746c.1.095.238.153.387.153a.535.535 0 00.546-.527.518.518 0 00-.16-.372zM5.997 2.766a.46.46 0 01-.469-.451c0-.25.21-.452.469-.452H8a.46.46 0 01.469.452.46.46 0 01-.469.451H5.997zM11.585.997H2.409c-.39 0-.741.154-.997.4a1.33 1.33 0 00-.415.961V19.14c0 .373.16.715.415.961.256.247.61.4.997.4h9.176c.387 0 .742-.153.997-.4.255-.246.415-.588.415-.96V2.357c0-.372-.16-.714-.415-.96-.255-.247-.61-.4-.997-.4z"
          fill="#4F4F4F"
        />
      </G>
      <Defs>
        <ClipPath id="clip0_848_10806">
          <Path
            fill="#fff"
            transform="translate(.997 .997)"
            d="M0 0H12.0001V19.5001H0z"
          />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

export default PhoneIcon;