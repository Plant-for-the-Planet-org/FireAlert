import { api } from '../../utils/api';
import { useEffect } from 'react';
import { type GetServerSidePropsContext } from 'next';

const VerifyPage = ({ alertMethodId, code, errorMessage }: { alertMethodId: string, code: string, errorMessage: string }) => {
    debugger;
    if (errorMessage) {
        return <div>Error: {errorMessage}</div>;
    }

    const mutation = api.alertMethod.verify.useMutation();

    useEffect(() => {
        const verify = async () => {
            if (alertMethodId && code) {
                console.log(`alertMethod id: ${alertMethodId}`);
                console.log(`code: ${code}`);

                // Initiate the mutation
                await mutation.mutateAsync({ params: { alertMethodId: alertMethodId }, body: { token: code } });
            }
        }

        verify();
    }, [alertMethodId, code]);

    if (mutation.isLoading) {
        return <div>Loading...</div>;
    } else if (mutation.isError) {
        return <div>Error: {mutation.error?.message}</div>;
    } else if (mutation.isSuccess) {
        return <div>Validation Successful</div>;
    } else {
        return <div>Enter your verification code</div>;
    }
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
    if (!context.params) {
        return {
            props: {
                errorMessage: 'Context params is not present',
            },
        };
    }
    const alertMethodId = context.params.alertMethodId;
    const code = context.query.code;

    if (!alertMethodId || !code) {
        return {
            props: {
                errorMessage: 'Invalid alert method ID or code.',
            },
        };
    }

    return {
        props: {
            initialAlertMethodId: alertMethodId,
            initialCode: code,
        },
    };
}

export default VerifyPage;
