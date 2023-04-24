import * as React from "react"
import Svg, { Path } from "react-native-svg"

function DropdownArrow(props) {
  return (
    <Svg
      width={26}
      height={26}
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M19.057 10.776l-1.405-1.337-4.576 4.343-4.577-4.343-1.405 1.337 5.982 5.69 5.981-5.69z"
        fill="#E86F56"
      />
    </Svg>
  )
}

export default DropdownArrow
