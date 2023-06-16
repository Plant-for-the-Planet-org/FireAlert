import { api } from '../../../utils/api';
import { useRouter } from 'next/router';

export const AlertPage = () => {
    const router = useRouter();
    const alertId = router.query.alertId as string;
    const {data, isLoading} = api.alert.getAlert.useQuery({
        id: alertId
    });
    const alertMethod = data?.data!

    if (!alertMethod) {
        return <div>Error: Alert not found</div>;
    }

    console.log(alertMethod);

    return (
        <div>
            <h1>Alert Details </h1>
                < p > ID: {alertMethod.id} </p>
                < p > Site Name: {alertMethod.site.name} </p>
                < p > Event Date: {alertMethod.eventDate.toString()} </p>
                < p > Type: {alertMethod.type} </p>
                < p > Latitude: {alertMethod.latitude} </p>
                < p > Longitude: {alertMethod.longitude} </p>
                < p > Detected By: {alertMethod.detectedBy} </p>
                < p > Confidence: {alertMethod.confidence} </p>
                < p > Distance: {alertMethod.distance} </p>
        </div> 
    )
}