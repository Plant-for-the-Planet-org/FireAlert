import * as React from 'react';
import Svg, {G, Ellipse, Path, Defs} from 'react-native-svg';
/* SVGR has dropped some elements not supported by react-native-svg: filter */

function PointSiteIcon(props) {
  return (
    <Svg
      width={25}
      height={30}
      viewBox="0 0 18 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <G filter="url(#filter0_f_1037_9811)">
        <Ellipse
          cx={2.90393}
          cy={1.03712}
          rx={2.90393}
          ry={1.03712}
          transform="matrix(-1 0 0 1 11.616 19.498)"
          fill="#000"
          fillOpacity={0.2}
        />
      </G>
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.712 0a8.712 8.712 0 00-3.18 16.825l2.684 3.669a.624.624 0 00.992 0l2.684-3.67A8.712 8.712 0 008.712 0z"
        fill="#EB5757"
      />
      <Path
        d="M4.978 8.712a3.734 3.734 0 117.467 0 3.734 3.734 0 01-7.467 0z"
        fill="#fff"
      />
      <Defs />
    </Svg>
  );
}

export default PointSiteIcon;
