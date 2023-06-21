import { memo } from 'react';
import type { FC } from 'react';

import resets from '../_resets.module.css';
import classes from './VerifyAlertMethod.module.css';
import { FrameIcon } from './VerifyAlertMethodSvgComponent/FrameIcon';

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
    const messageArray = message? message.split('. ') : []
    return (
        <div className={`${resets.componentsResets} ${classes.root}`}>
            <div className={classes.mainCard}>
                <div className={classes.mailImageWrapper}>
                    <div className={classes.mailImage}>
                        <FrameIcon className={classes.image} />
                    </div>
                </div>
                <div className={classes.mainContent}>
                    <div className={classes.verifyHeader}>
                        <div className={classes.verifyAlertMethod}>Verify Alert Method</div>
                        <div className={classes.enterTheCodeYouReceived}>Enter the code you received</div>
                    </div>
                    <div className={classes.otpCard}>
                        <OtpBox frames={frameValues} />
                    </div>
                    {isDone && (
                        <div className={classes.oTPTokenHasExpiredPleaseReques}>
                            {isSuccess !== undefined && !isSuccess && (
                                <>
                                    <div className={classes.textBlock}>{messageArray[0]}</div>
                                    <div className={classes.textBlock2}>{messageArray[1]}</div>
                                </>
                            )}
                            {isSuccess !== undefined && isSuccess && (
                                <>
                                    <div className={classes.textBlock}>{messageArray[0]}</div>
                                    <div className={classes.successMessage}>{messageArray[1]}</div>
                                </>
                            )}
                        </div>
                    )}
                    <button className={classes.completeVerificationButton} onClick={onVerificationComplete}>
                        <div className={classes.completeVerificationText}>Complete Verification</div>
                    </button>
                </div>
            </div>
        </div>
    );
});


interface OtpValueContainerProps {
    value: string;
}

const OtpValueContainer: FC<OtpValueContainerProps> = memo(function OtpValueContainer({ value }) {
    return <div className={classes.otpValueContainer}>{value}</div>;
});

interface OtpBoxProps {
    frames: string[];
}

const OtpBox: FC<OtpBoxProps> = memo(function OtpBox({ frames }) {
    return (
        <>
            {frames.map((value, index) => (
                <div key={index} className={classes.otpBox}>
                    <OtpValueContainer value={value} />
                </div>
            ))}
        </>
    );
});
