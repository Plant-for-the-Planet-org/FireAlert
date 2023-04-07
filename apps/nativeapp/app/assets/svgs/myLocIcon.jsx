import * as React from "react"
import Svg, { G, Path, Defs, ClipPath } from "react-native-svg"

function MyLocIcon(props) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <G clipPath="url(#clip0_467_50)" fill="#757575">
        <Path d="M22.5 10.5h-1.635A8.987 8.987 0 0013.5 3.135V1.458C13.5.63 12.828 0 12.042 0 11.256 0 10.5.672 10.5 1.458v1.677A8.986 8.986 0 003.135 10.5H1.458C.672 10.5 0 11.17 0 11.958c0 .787.672 1.542 1.458 1.542h1.635c.675 3.769 3.638 6.731 7.407 7.364V22.5c0 .83.67 1.459 1.458 1.459.787 0 1.542-.628 1.542-1.458v-1.635a8.986 8.986 0 007.364-7.365H22.5c.83 0 1.501-.67 1.501-1.5s-.67-1.5-1.5-1.5zM12 18c-3.316 0-6-2.684-6-6s2.684-6 6-6 6 2.684 6 6-2.681 6-6 6z" />
        <Path d="M12 7.875a4.125 4.125 0 100 8.25 4.125 4.125 0 000-8.25z" />
      </G>
      <Defs>
        <ClipPath id="clip0_467_50">
          <Path fill="#fff" d="M0 0H24V24H0z" />
        </ClipPath>
      </Defs>
    </Svg>
  )
}

export default MyLocIcon
