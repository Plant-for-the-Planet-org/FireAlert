import React from 'react';
import Image from 'next/image';
import alertIcon from '../../../public/alertPage/alertIcon.svg';

interface DetectionInfoProps {
  detectedBy: string | null;
  timeAgo: string;
  formattedDateString: string;
  confidence: string;
}

export const DetectionInfo: React.FC<DetectionInfoProps> = ({
  detectedBy,
  timeAgo,
  formattedDateString,
  confidence,
}) => {
  return (
    <div className="w-full">
      <div className="w-full p-5 lg:p-5 rounded-xl bg-red-100/10 flex items-center overflow-hidden flex-col sm:flex-row lg:flex-row">
        <div className="hidden sm:block lg:block object-contain">
          <Image
            src={alertIcon}
            alt="Alert Icon"
            className="w-8 h-8 lg:w-11 lg:h-11"
          />
        </div>
        <div className="w-full flex flex-col sm:ml-2.5 lg:ml-2.5 justify-between">
          <div className="text-planet-dark-gray text-[10px] sm:text-[10px] font-semibold font-sans pt-2 sm:pt-0">
            DETECTED BY {detectedBy}
          </div>
          <div className="flex flex-col">
            <p className="text-sm sm:text-lg font-sans my-1.5">
              <span className="text-primary font-semibold">{timeAgo}</span>
              <span className="text-planet-dark-gray">
                {' '}
                ({formattedDateString})
              </span>
            </p>
            <p className="block mt-0 mb-2.5">
              <span className="text-planet-dark-gray text-sm font-bold font-sans">
                {confidence}
              </span>
              <span className="text-planet-dark-gray text-sm font-sans">
                {' '}
                alert confidence
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
