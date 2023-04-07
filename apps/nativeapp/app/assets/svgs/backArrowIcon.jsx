import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function SvgComponent(props) {
  return (
    <Svg
      width={17}
      height={15}
      viewBox="0 0 17 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17 7.5c0 .284-.112.557-.311.757-.2.201-.47.314-.751.314H3.628l4.563 4.598a1.073 1.073 0 01.311.758 1.08 1.08 0 01-.311.759 1.063 1.063 0 01-1.16.232 1.063 1.063 0 01-.345-.232L.312 8.258a1.072 1.072 0 01-.23-1.169c.053-.13.131-.248.23-.347L6.686.314a1.06 1.06 0 011.505 0 1.077 1.077 0 010 1.517L3.629 6.429h12.309c.281 0 .552.113.75.314.2.2.312.473.312.757z"
        fill="#333"
      />
    </Svg>
  );
}

export default SvgComponent;
