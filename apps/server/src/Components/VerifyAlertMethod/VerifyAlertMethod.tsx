import {memo} from 'react';
import type {FC} from 'react';
import Image from 'next/image';
import classes from './VerifyAlertMethod.module.css';
import letterImage from '../../../public/verify/letterImage.png';

interface Props {
  otpValues: string[];
  setOtpValues: (values: string[]) => void;
  onVerificationComplete: () => void;
  isSuccess: boolean;
  message: string;
  isDone: boolean;
}

export const VerifyAlertMethod: FC<Props> = memo(function VerifyAlertMethod({
  otpValues,
  setOtpValues,
  onVerificationComplete,
  isSuccess,
  message,
  isDone,
}: Props) {
  const handleInputChange = (index: number, newValue: string) => {
    const newFrames = [...otpValues];
    newFrames[index] = newValue;
    setOtpValues(newFrames);
  };

  return (
    <div className={classes.root}>
      <div className={classes.mainCard}>
        <div className={classes.mailImageWrapper}>
          <div className={classes.mailImage}>
            <Image
              src={letterImage}
              alt="Letter Image"
              className={classes.image}
            />
          </div>
        </div>
        <div className={classes.mainContent}>
          <div className={classes.verifyHeader}>
            <div className={classes.verifyAlertMethodText}>
              Verify Alert Method
            </div>
            <div className={classes.code}>Enter the code you received</div>
          </div>
          <div className={classes.midContent}>
            {!isDone && (
              <div className={classes.otpCard}>
                {otpValues.map((value, index) => (
                  <div className={classes.otpBoxWrapper} key={index}>
                    <input
                      className={classes.otpValueContainer}
                      defaultValue={value}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange(index, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            {isDone && (
              <div className={classes.verificationResult}>
                {isSuccess !== undefined && !isSuccess && (
                  <>
                    <div className={classes.textBlockError}>{message}</div>
                  </>
                )}
                {isSuccess !== undefined && isSuccess && (
                  <>
                    <div className={classes.textBlockSuccess}>{message}</div>
                  </>
                )}
              </div>
            )}
          </div>
          {!isDone && (
            <button
              className={classes.completeVerificationButton}
              onClick={onVerificationComplete}>
              <div className={classes.completeVerificationText}>
                Complete Verification
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
