import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';

export default function AlertPage() {
  const router = useRouter();
  const { id } = router.query;

  // Use useState to hold the API response and loading status
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data when the page loads
    // Make sure to check that id exists before making the call
    if (id) {
      api.alert.getAlert.mutate({ id })
        .then(response => {
          setData(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching data:', error);
          setLoading(false);
        });
    }
  }, [id]); // Rerun this effect if id changes

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>No data found for this alert.</div>;
  }

  return (
    <div>
      <h1>Alert Details</h1>
      <p>ID: {data.id}</p>
      <p>Site Name: {data.site.name}</p>
      <p>Event Date: {data.eventDate}</p>
      <p>Type: {data.type}</p>
      <p>Latitude: {data.latitude}</p>
      <p>Longitude: {data.longitude}</p>
      <p>Detected By: {data.detectedBy}</p>
      <p>Confidence: {data.confidence}</p>
      <p>Distance: {data.distance}</p>
      {/* Render other data as necessary */}
    </div>
  );
}
