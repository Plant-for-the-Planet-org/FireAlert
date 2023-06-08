import * as React from 'react';
import Svg, {G, Path} from 'react-native-svg';

function GlobeWebIcon(props) {
  return (
    <Svg
      xmlns="http://www.w3.org/2000/svg"
      width={256}
      height={256}
      viewBox="0 0 256 256"
      {...props}>
      <G
        stroke="none"
        strokeWidth={0}
        strokeDasharray="none"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit={10}
        fill="none"
        fillRule="nonzero"
        opacity={1}>
        <Path
          d="M65.293 45c0-4.936-.46-9.7-1.294-14.127H47v28.254h16.999A76.628 76.628 0 0065.293 45zM47 4.21v22.663h16.119C60.033 14.61 53.974 5.663 47 4.21zM47 85.79c6.974-1.453 13.033-10.4 16.119-22.663H47V85.79zM87.725 59.127A44.924 44.924 0 0090 45c0-4.937-.806-9.683-2.275-14.127H68.11c.766 4.427 1.183 9.169 1.183 14.127s-.417 9.7-1.183 14.127h19.615zM22.696 26.873C26.393 10.915 34.879 0 45 0 26.599 0 10.787 11.05 3.813 26.873h18.883z"
          transform="matrix(2.81 0 0 2.81 1.407 1.407)"
          stroke="none"
          strokeWidth={1}
          strokeDasharray="none"
          strokeLinecap="butt"
          strokeLinejoin="miter"
          strokeMiterlimit={10}
          fill="#4f4f4f"
          fillRule="nonzero"
          opacity={1}
        />
        <Path
          d="M67.305 26.873h18.883C79.213 11.05 63.401 0 45 0c10.121 0 18.608 10.915 22.305 26.873zM43 4.21c-6.974 1.453-13.032 10.4-16.118 22.663H43V4.21zM67.305 63.127C63.608 79.084 55.121 90 45 90c18.402 0 34.213-11.051 41.188-26.873H67.305zM22.696 63.127H3.813C10.787 78.949 26.598 90 45 90c-10.121 0-18.608-10.916-22.304-26.873zM43 30.873H26.002C25.168 35.3 24.708 40.064 24.708 45s.46 9.699 1.294 14.127H43V30.873z"
          transform="matrix(2.81 0 0 2.81 1.407 1.407)"
          stroke="none"
          strokeWidth={1}
          strokeDasharray="none"
          strokeLinecap="butt"
          strokeLinejoin="miter"
          strokeMiterlimit={10}
          fill="#4f4f4f"
          fillRule="nonzero"
          opacity={1}
        />
        <Path
          d="M43 85.79V63.127H26.882C29.968 75.39 36.026 84.337 43 85.79zM2.275 30.873A44.924 44.924 0 000 45c0 4.937.806 9.683 2.275 14.127H21.89C21.125 54.7 20.708 49.958 20.708 45s.417-9.7 1.183-14.127H2.275z"
          transform="matrix(2.81 0 0 2.81 1.407 1.407)"
          stroke="none"
          strokeWidth={1}
          strokeDasharray="none"
          strokeLinecap="butt"
          strokeLinejoin="miter"
          strokeMiterlimit={10}
          fill="#4f4f4f"
          fillRule="nonzero"
          opacity={1}
        />
      </G>
    </Svg>
  );
}

export default GlobeWebIcon;
