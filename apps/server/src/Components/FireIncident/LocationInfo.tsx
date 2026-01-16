import React, {useState} from 'react';
import Image from 'next/image';
import locationPinIcon from '../../../public/alertPage/locationPin.svg';
import copyIcon from '../../../public/alertPage/copy.svg';

interface LocationInfoProps {
  latitude: string;
  longitude: string;
}

export const LocationInfo: React.FC<LocationInfoProps> = ({
  latitude,
  longitude,
}) => {
  const [isCoordinatesCopied, setIsCoordinatesCopied] = useState(false);

  const handleCopyCoordinates = () => {
    setIsCoordinatesCopied(true);
    navigator.clipboard.writeText(`${latitude}, ${longitude}`);
    setTimeout(() => setIsCoordinatesCopied(false), 200);
  };

  return (
    <div className="w-full outline outline-1 outline-gray-medium rounded-xl bg-white/10 overflow-hidden mt-2.5 lg:mt-4.5 lg:mb-4.5 p-1.5 lg:p-4.5 flex flex-row justify-between items-center mr-0 sm:mr-2.5 lg:mr-0">
      <div className="flex flex-row justify-between w-4/5 items-center">
        <div className="hidden sm:block object-contain">
          <Image
            src={locationPinIcon}
            alt="Location Pin Icon"
            className="w-4.5 h-5"
          />
        </div>
        <div className="flex h-full flex-col ml-2.5 flex-grow">
          <div className="text-planet-dark-gray text-[8px] font-bold font-sans relative w-min h-min whitespace-nowrap flex-col">
            LOCATION
          </div>
          <div className="text-planet-dark-gray text-base font-sans relative w-min h-min whitespace-nowrap flex-col">
            {latitude}, {longitude}
          </div>
        </div>
      </div>
      <div
        className="relative overflow-visible cursor-pointer transition-colors duration-300 hover:opacity-100 group"
        onClick={handleCopyCoordinates}>
        <Image
          src={copyIcon}
          alt="Copy Icon"
          className={`w-8 h-8 opacity-95 group-hover:opacity-100 ${
            isCoordinatesCopied
              ? 'scale-90 transition-transform duration-100'
              : ''
          }`}
        />
      </div>
    </div>
  );
};
