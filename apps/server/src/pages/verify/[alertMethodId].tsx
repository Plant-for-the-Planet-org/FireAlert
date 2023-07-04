import { api } from '../../utils/api';
import { useState } from 'react';
import { useRouter } from 'next/router'
import { VerifyAlertMethod } from '../../Components/VerifyAlertMethod/VerifyAlertMethod'

export default function Page() {
    const router = useRouter();
    const mutation = api.alertMethod.verify.useMutation();
    const alertMethodId = router.query.alertMethodId as string;
    const code = router.query.code as string;

    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('');
    const [isDone, setIsDone] = useState(false);
    
    const handleCompleteVerification = async () => {
        if (alertMethodId && code) {
            setIsDone(true);
            try {
                await mutation.mutateAsync({ params: { alertMethodId: alertMethodId }, body: { token: code } });
                setIsSuccess(true);
                setMessage('Verification Successful. Alert Method is now verified.');
            } catch (error) {
                setIsSuccess(false);
                setMessage('OTP Token has expired. Please request a new code from the FireAlert App.');
            }
        }
    };
    return (
        <VerifyAlertMethod
            otp={code}
            onVerificationComplete={handleCompleteVerification}
            isSuccess={isSuccess}
            message={message}
            isDone={isDone}
        />
    );
}
