import { memo } from 'react';
import type { FC } from 'react';
import Image from 'next/image';
import classes from './VerifyAlertMethod.module.css';
import letterImage from '../../../public/verify/letterImage.png'
import OtpBox from './OtpBox';

interface Props {
    className?: string;
    otp: string;
    onVerificationComplete: () => void;
    isSuccess: boolean;
    message: string;
    isDone: boolean;
}

export const VerifyAlertMethod: FC<Props> = memo(function VerifyAlertMethod({
    otp,
    onVerificationComplete,
    isSuccess,
    message,
    isDone
}: Props) {

    const frameValues = otp ? otp.split('') : [];
    const messageArray = message ? message.split('. ') : []
    return (
        <div className={classes.root}>
            <div className={classes.mainCard}>
                <div className={classes.mailImageWrapper}>
                    <div className={classes.mailImage}>
                        <Image src={letterImage} alt="Letter Image" className={classes.image} />
                    </div>
                </div>
                <div className={classes.mainContent}>
                    <div className={classes.verifyHeader}>
                        <div className={classes.verifyAlertMethodText}>Verify Alert Method</div>
                        <div className={classes.code}>Enter the code you received</div>
                    </div>
                    <div className={classes.midContent}>
                        <div className={classes.otpCard}>
                            <OtpBox frames={frameValues} />
                        </div>
                        {isDone && (
                            <div className={classes.verificationResult}>
                                {isSuccess !== undefined && !isSuccess && (
                                    <>
                                        <div className={classes.textBlockError}>{messageArray[0]}</div>
                                        <div className={classes.textBlock2Error}>{messageArray[1]}</div>
                                    </>
                                )}
                                {isSuccess !== undefined && isSuccess && (
                                    <>
                                        <div className={classes.textBlockSuccess}>{messageArray[0]}</div>
                                        <div className={classes.tetBlock2Success}>{messageArray[1]}</div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <button className={classes.completeVerificationButton} onClick={onVerificationComplete}>
                        <div className={classes.completeVerificationText}>Complete Verification</div>
                    </button>
                </div>
            </div>
        </div>
    );
});







