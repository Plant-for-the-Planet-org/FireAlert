import * as React from "react"
import Svg, { Path } from "react-native-svg"

function DistanceIcon(props) {
  return (
    <Svg
      width={22}
      height={17}
      viewBox="0 0 22 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M12.374 13.4l-1.697 1.706H21v.255H7.7c-3.677 0-6.7-3.063-6.7-6.89 0-3.829 3.023-6.89 6.7-6.89s6.7 3.061 6.7 6.89a6.968 6.968 0 01-2.026 4.93zM6.5 8.47c0-.714.562-1.254 1.2-1.254.638 0 1.2.54 1.2 1.254 0 .715-.562 1.255-1.2 1.255-.638 0-1.2-.54-1.2-1.255zm-3.1 0c0 2.396 1.903 4.382 4.3 4.382S12 10.866 12 8.47 10.097 4.09 7.7 4.09 3.4 6.074 3.4 8.47z"
        stroke="#4F4F4F"
        strokeWidth={2}
      />
    </Svg>
  )
}

export default DistanceIcon
