import * as React from "react"
import Svg, { Path } from "react-native-svg"

function PhoneIcon(props) {
  return (
    <Svg
      width={16}
      height={23}
      viewBox="0 0 16 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M13 1.24H3c-1.105 0-2 .898-2 2.007v16.06c0 1.109.895 2.007 2 2.007h10c1.105 0 2-.898 2-2.007V3.247a2.004 2.004 0 00-2-2.008zM8 17.3h.01"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default PhoneIcon
