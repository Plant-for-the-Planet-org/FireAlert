import * as React from "react"
import Svg, { Path } from "react-native-svg"

function PencilIcon(props) {
  return (
    <Svg
      width={22}
      height={25}
      viewBox="0 0 22 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M2.674 17.575v3.06c0 .282.196.503.446.503h2.71c.115 0 .231-.05.312-.15l9.733-10.983-3.342-3.774-9.725 10.982a.528.528 0 00-.134.362zM18.46 7.086a1.096 1.096 0 000-1.419l-2.085-2.355a.818.818 0 00-1.257 0l-1.632 1.842 3.343 3.774 1.631-1.842z"
        fill="#4F4F4F"
      />
    </Svg>
  )
}

export default PencilIcon
