import * as React from "react"
import Svg, { Path } from "react-native-svg"

function LogoutIcon(props) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M17.847 14.227L21 11.074 17.847 7.92M8.39 11.074h12.525m-10.062 9.778C5.41 20.852 1 17.158 1 11s4.409-9.852 9.852-9.852"
        stroke="#E86F56"
        strokeWidth={2}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default LogoutIcon
