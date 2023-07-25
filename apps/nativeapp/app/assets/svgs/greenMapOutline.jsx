import * as React from 'react';
import Svg, {G, Path, Defs, ClipPath} from 'react-native-svg';

function GreenMapOutline(props) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <G clipPath="url(#clip0_1225_10223)" fill="#68B030">
        <Path d="M2.637 23.852c.391.202.87.202 1.26-.014l5.518-3.09 5.533 3.09c.39.216.898.216 1.289 0l6.17-3.442c.376-.216.608-.594.608-.998V6.09c0-.419-.247-.81-.638-1.013a1.383 1.383 0 00-1.26.014L15.6 8.18l-2.158-1.2-.883 2.24 1.897 1.053v10.568l-3.867-2.16v-6.235c-.42.23-.912.364-1.404.364H9.14c-.29 0-.565-.04-.84-.121v5.965l-3.78 2.106V10.193l1.217-.675-.493-1.107-1.433-.553-1.188.661c-.377.216-.608.594-.608.999v13.321c0 .419.246.81.637 1.013h-.015zM16.73 10.26l3.751-2.105v10.581l-3.75 2.106V10.26z" />
        <Path d="M3.318 6.521l3.736 1.445 1.55 3.482a.79.79 0 00.753.459.778.778 0 00.739-.486l3.316-8.422a.725.725 0 00-.188-.783.83.83 0 00-.565-.216.97.97 0 00-.275.04L3.347 5.118a.77.77 0 00-.522.688c0 .31.174.594.478.715h.015z" />
      </G>
      <Defs>
        <ClipPath id="clip0_1225_10223">
          <Path fill="#fff" transform="translate(2 1)" d="M0 0H21V23H0z" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

export default GreenMapOutline;
