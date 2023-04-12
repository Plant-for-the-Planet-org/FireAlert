import * as React from "react"
import Svg, { Path } from "react-native-svg"

function SatelliteIcon(props) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M15.172 7.127v-.001l-.708.707-2.883 2.883-.619.62-.002-.003-.707.708-.387.386-.49.49.286.63c.74 1.635.77 3.508.08 5.151l-3.78-3.778-.175-.176-.531-.531-.176-.176-3.779-3.779a6.458 6.458 0 015.152.08l.63.285.49-.489.382-.383.707-.706-.002-.002.624-.624 2.883-2.883.621-.621h0l.708-.708 1.867-1.87v-.001a.313.313 0 01.441 0l1.856 1.856a.314.314 0 010 .441v.001l-1.868 1.872-.62.62zM3.417 16.405l.14.038.038.14.015.053.006.02.003.014a.249.249 0 01-.246.207c-.14 0-.25-.11-.25-.25 0-.124.089-.226.207-.246l.013.003.021.006.054.015z"
        stroke="#4F4F4F"
        strokeWidth={2}
      />
    </Svg>
  )
}

export default SatelliteIcon