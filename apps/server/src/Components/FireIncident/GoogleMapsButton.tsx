import React from 'react';

interface GoogleMapsButtonProps {
  googleMapUrl: string;
}

export const GoogleMapsButton: React.FC<GoogleMapsButtonProps> = ({
  googleMapUrl,
}) => {
  return (
    <div className="h-1/4 w-full flex justify-center items-center mb-5">
      <button
        className="w-min sm:w-[41.5%] lg:w-[70.5%] px-[5%] py-[3%] rounded-xl bg-primary border-0 transition-all duration-300 hover:bg-white hover:text-primary hover:outline hover:outline-2 hover:outline-primary hover:-outline-offset-1 cursor-pointer group"
        onClick={() => window.open(googleMapUrl, '_blank')}>
        <div className="text-white text-lg font-bold font-sans z-0 whitespace-nowrap flex-col leading-6 group-hover:text-primary">
          Open in Google Maps
        </div>
      </button>
    </div>
  );
};
