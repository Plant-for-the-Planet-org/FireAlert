import { api } from '../../utils/api';
import { useEffect } from 'react';
import { useRouter } from 'next/router'

export default function Page() {
    const router = useRouter()
    const mutation = api.alertMethod.verify.useMutation();
    const alertMethodId = router.query.alertMethodId as string;
    const code = router.query.code as string;


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
    } 
    if (mutation.isError) {
        return <div>Error: {JSON.stringify(mutation.error.message)}</div>;
    } 
    if (mutation.isSuccess) {
        return <div>Validation Successful</div>;
    } 
}