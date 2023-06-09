// In this page we will get  the AlertMethod Id and code from the url
// when the user clicks Verify button, we'll use the TRPC client to call the verifyAlertMethod mutation
// and display the result to the user
// URL: /verify/:id?code=:code

// Import necessary hooks and utilities
import { useRouter } from 'next/router';
import { useState } from 'react';
import { api } from '../../utils/api';

// Define the VerifyAlertMethodPage component
export default function VerifyAlertMethodPage() {
  // Use the useRouter hook to access the URL parameters
  const router = useRouter();
  const { id } = router.query;
  const code = router.query.code;

  // Use useState to hold the API response, loading status, and any error
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Define the function to run when the Verify button is clicked
  const handleClick = async () => {
    // Indicate that the request is loading
    setLoading(true);
    // Reset any previous error
    setError(null);

    try {
      // Make the API request
      const data = await api.alertMethod.verify.mutate({
        params: {
          alertMethodId: id,
        },
        body: {
          token: code,
        },
      });

      // If the request was successful, store the response
      setResponse(data);
    } catch (err) {
      // If an error occurred, store the error message
      setError(err.message);
    } finally {
      // Regardless of success or failure, indicate that loading has finished
      setLoading(false);
    }
  };

  // Render the component
  return (
    <div>
      <h1>Verify Alert Method</h1>
      <p>Id: {id}</p>
      <p>Code: {code}</p>
      <button onClick={handleClick}> Verify AlertMethod</button>

      {/* Display a loading message if the request is in progress */}
      {loading && <p>Verifying...</p>}
      
      {/* Display an error message if an error occurred */}
      {error && <p>Error: {error}</p>}
      
      {/* Display a success message if the request was successful */}
      {response && <p>Success: {response}</p>}
    </div>
  );
}
