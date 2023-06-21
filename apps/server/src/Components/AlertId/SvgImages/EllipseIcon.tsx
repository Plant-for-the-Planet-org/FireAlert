import { memo, SVGProps } from 'react';

const EllipseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg preserveAspectRatio='none' viewBox='0 0 31 31' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
    <circle cx={15.5} cy={15.5} r={15.5} fill='#E86F56' />
  </svg>
);
const Memo = memo(EllipseIcon);
export { Memo as EllipseIcon };
