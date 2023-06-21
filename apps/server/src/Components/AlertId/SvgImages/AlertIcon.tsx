import { memo, SVGProps } from 'react';

const AlertIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg preserveAspectRatio='none' viewBox='0 0 45 45' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
    <circle cx={22.5} cy={22.5} r={22.5} fill='white' />
    <path
      d='M33.6009 23.3883L30.1499 19.9331L32.2042 17.8746C32.7671 17.3117 32.7671 16.3963 32.2042 15.8333L30.1628 13.792C29.5998 13.2291 28.6845 13.2291 28.1215 13.792L26.0672 15.8505L22.6163 12.3997C22.3455 12.1332 21.9974 12 21.645 12C21.2926 12 20.9445 12.1332 20.6781 12.3997L16.5223 16.5553C15.9895 17.0882 15.9895 17.9563 16.5223 18.4935L19.9733 21.9486L19.5521 22.3698C17.2443 21.3255 14.5584 21.3942 12.3107 22.6018C11.9454 22.7995 11.8982 23.3066 12.1904 23.5988L16.8103 28.2186L16.0453 28.9836C15.9336 28.9535 15.8304 28.9148 15.7101 28.9148C14.9494 28.9148 14.3349 29.5293 14.3349 30.29C14.3349 31.0506 14.9494 31.6652 15.7101 31.6652C16.4708 31.6652 17.0853 31.0506 17.0853 30.29C17.0853 30.1697 17.0467 30.0665 17.0166 29.9548L17.7815 29.1898L22.4014 33.8096C22.6936 34.1018 23.2051 34.0546 23.3984 33.6893C24.6061 31.4417 24.6748 28.7558 23.6305 26.4481L24.056 26.0226L27.5069 29.4778C27.7734 29.7442 28.1258 29.8774 28.4739 29.8774C28.822 29.8774 29.1744 29.7442 29.4408 29.4778L33.5966 25.3221C34.1338 24.7892 34.1338 23.9211 33.6009 23.3883ZM18.4734 17.5222L21.645 14.3507L24.6061 17.3117L21.4345 20.4832L18.4734 17.5222ZM28.4782 27.5267L25.5171 24.5658L28.6887 21.3942L31.6498 24.3552L28.4782 27.5267Z'
      stroke='#E86F56'
      strokeWidth={2}
    />
  </svg>
);
const Memo = memo(AlertIcon);
export { Memo as AlertIcon };
