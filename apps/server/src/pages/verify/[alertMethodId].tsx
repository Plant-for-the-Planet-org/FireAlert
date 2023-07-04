// Can call this page with this url: http://localhost:3000/verify/clj1awq250001vtoccrxvy4km?code=12568

import { api } from '../../utils/api';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router'
import { VerifyAlertMethod } from '../../Components/VerifyAlertMethod/VerifyAlertMethod'

export default function Page() {
    const router = useRouter();
    const mutation = api.alertMethod.verify.useMutation();
    const alertMethodId = router.query.alertMethodId as string;
    const code = router.query.code as string;

    const [otpValues, setOtpValues] = useState<string[]>([]);

    useEffect(() => {
        if (code) {
            setOtpValues(code.split(''));
        }
    }, [code]);

    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('');
    const [isDone, setIsDone] = useState(false);

    const handleCompleteVerification = async () => {
        if (alertMethodId && otpValues.length) {
            try {
                const otpCode = otpValues.join('');
                await mutation.mutateAsync({ params: { alertMethodId: alertMethodId }, body: { token: otpCode } });
                setIsSuccess(true);
                setMessage('Verification Successful. Alert Method is now verified.');
                setIsDone(true);
            } catch (error) {
                setIsSuccess(false);
                setMessage('OTP Token has expired. Please request a new code from the FireAlert App.');
                setIsDone(true);
            }
        }
    };
    if (router.isReady) {
        return (
            <VerifyAlertMethod
                otpValues={otpValues}
                setOtpValues={setOtpValues}
                onVerificationComplete={handleCompleteVerification}
                isSuccess={isSuccess}
                message={message}
                isDone={isDone}
            />
        );
    }
}
