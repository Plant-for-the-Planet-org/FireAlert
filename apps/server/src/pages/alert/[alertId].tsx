import { api } from '../../utils/api';
import { useEffect } from 'react';
import { type GetServerSidePropsContext } from 'next';

const Alert = ({ alertId, errorMessage }: { alertId: string, errorMessage: string }) => {
    const { data, isLoading, isError } = api.alert.getAlert.useQuery({ id: alertId });

    useEffect(() => {
        if (alertId) {
            console.log(`alertId: ${alertId}`);
        }
    }, [alertId]);

    if (errorMessage) {
        return <div>Error: {errorMessage}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (isError) {
        return <div>Error: Failed to load alert data</div>;
    }

    return (
        <div>
            Alert ID: {data.data.id} <br/>
        </div>
    );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
    if (!context.params) {
        return {
            props: {
                errorMessage: 'Context params is not present',
            },
        };
    }
    const alertId = context.params.alertId;

    if (!alertId) {
        return {
            props: {
                errorMessage: 'Invalid alertId',
            },
        };
    }

    return {
        props: {
            alertId: alertId,
        },
    };
}

export default Alert;
