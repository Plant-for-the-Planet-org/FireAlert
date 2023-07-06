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

export default function Page({ alertMethodId, code }: PageProps) {
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
                await mutation.mutateAsync({ params: { alertMethodId: alertMethodId }, body: { token: otpCode } });
                setIsSuccess(true);
                setMessage('Verification Successful. Alert Method is now verified.');
                setIsDone(true);
            } catch (error) {
                setIsSuccess(false);
                let errorMessage = error!.shape!.message || 'Unknown error';
                if (error!.shape!.data.httpStatus === 503) {
                    errorMessage = "Server under Maintenance. Please check back in a few minutes."
                } else {
                    errorMessage += ". Please try again with correct parameters."
                }
                setMessage(errorMessage);
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
