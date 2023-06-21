import { memo, SVGProps } from 'react';

const LocationPinIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg preserveAspectRatio='none' viewBox='0 0 18 20' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
    <path
      d='M0.242814 6.49156C2.21329 -2.17052 15.0464 -2.16052 17.0068 6.50157C18.1571 11.5828 14.9964 15.8838 12.2257 18.5445C11.2575 19.4782 9.96491 20 8.61983 20C7.27475 20 5.98212 19.4782 5.01396 18.5445C2.2533 15.8838 -0.907462 11.5728 0.242814 6.49156Z'
      stroke='#4F4F4F'
      strokeWidth={2}
    />
    <circle cx={9} cy={9} r={2} stroke='#4F4F4F' strokeWidth={2} />
  </svg>
);
const Memo = memo(LocationPinIcon);
export { Memo as LocationPinIcon };
