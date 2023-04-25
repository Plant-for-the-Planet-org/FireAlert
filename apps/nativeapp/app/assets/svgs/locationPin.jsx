import * as React from "react"
import Svg, { Path, Circle } from "react-native-svg"

function LocationPin(props) {
  return (
    <Svg
      width={21}
      height={22}
      viewBox="0 0 21 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M2.243 7.492c1.97-8.663 14.803-8.653 16.764.01 1.15 5.08-2.01 9.382-4.781 12.042a5.195 5.195 0 01-7.212 0c-2.76-2.66-5.921-6.971-4.771-12.052z"
        stroke="#4F4F4F"
        strokeWidth={2}
      />
      <Circle cx={11} cy={10} r={1} stroke="#4F4F4F" strokeWidth={2} />
    </Svg>
  )
}

export default LocationPin
