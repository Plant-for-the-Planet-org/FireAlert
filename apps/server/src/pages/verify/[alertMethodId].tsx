import { api } from '../../utils/api';
import { useState, useEffect } from 'react';
import { GetServerSidePropsContext } from 'next';
import { VerifyAlertMethod } from '../../Components/VerifyAlertMethod/VerifyAlertMethod'

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
    const alertMethodId = context.query.alertMethodId as string;
    const code = context.query.code as string;
    return {
        props: {
            alertMethodId,
            code
        }
    };
}

interface PageProps {
    alertMethodId: string;
    code: string;
}

export default function Page({alertMethodId, code}: PageProps) {
    const mutation = api.alertMethod.verify.useMutation();
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
                const verifyMutation = await mutation.mutateAsync({ params: { alertMethodId: alertMethodId }, body: { token: otpCode } });
                console.log(`output: ${JSON.stringify(verifyMutation)}`)
                setIsSuccess(true);
                setMessage('Verification Successful. Alert Method is now verified.');
                setIsDone(true);
            } catch (error) {
                setIsSuccess(false);
                const errorMessage = `${error}`.split(': ')[1]
                setMessage(`${errorMessage}` || 'OTP Token has expired. Please request a new code from the FireAlert App.');
                setIsDone(true);
            }
        }
    };

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
