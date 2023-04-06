// Here I am just showing how to use tRPC frontend!

import { useSession } from "next-auth/react";
import { useState } from "react";
import { api } from "../utils/api";
import { makeCoordinates } from "../utils/math";


const Sites: React.FC = () => {
    const { data: sessionData, status } = useSession();

    if (status !== "authenticated") return null;

    return (
        <>
            <ShowSites />
            <CreateSiteForm />
        </>
    )
}

const CreateSiteForm: React.FC = () => {
    const [type, setType] = useState('')
    const [unarrayedCoordinates, setUnarrayedCoordinates] = useState('')
    const [radius, setRadius] = useState('')

    const { data: session, status } = useSession()

    const utils = api.useContext();
    
    const { data: sites, isLoading, refetch: refetchSites } = api.site.getAllSites.useQuery(
        undefined, // no input
        { enabled: session?.user !== undefined },
    );

    const postSite = api.site.createSite.useMutation({
        onSuccess: () => {
            refetchSites()
        }
    })



    return (
        <>
            {session ? (
                <form
                    onSubmit={(event) => {
                        event.preventDefault()
                        const coordinates = makeCoordinates(unarrayedCoordinates)

                        const geometry = { type: type, coordinates: coordinates }
                        postSite.mutate({
                            type: type,
                            geometry: geometry,
                            radius: radius,
                        })
                        setType('')
                        setUnarrayedCoordinates('')
                        setRadius('')
                    }}>
                    <input
                        type="text"
                        placeholder="type"
                        value={type}
                        onChange={(event) => setType(event.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="unarrayed coordinates"
                        value={unarrayedCoordinates}
                        onChange={(event) => setUnarrayedCoordinates(event.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="radius"
                        value={radius}
                        onChange={(event) => setRadius(event.target.value)}
                    />
                    <button type='submit'>Submit</button>
                </form>) : (
                <p>Not LoggedIn</p>
            )}
        </>


    )
}

const ShowSites: React.FC = () => {

    const { data: sessionData } = useSession()

    const { data: sites, isLoading, refetch: refetchSites } = api.site.getAllSites.useQuery(
        undefined, // no input
        { enabled: sessionData?.user !== undefined },
    );

    if (isLoading) {
        return <div>Fetching Sites...</div>
    }

    return (
        <>
            <div>
                <p>List of all sites</p>
                <ul>
                    {sites?.data.map(site => (
                        <li key={site.id}>
                            <p>Site ID: {site.id}</p>
                            <p>Type: {site.type}</p>
                            <p>{JSON.stringify(site.geometry)}</p>
                            <p>Radius: {site.radius}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    )
}

export default Sites;