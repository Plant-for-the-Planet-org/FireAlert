// Here I am just showing how to use tRPC frontend!

import { useSession } from "next-auth/react";
import { useState } from "react";
import { api } from "../../utils/api";
import { makeCoordinates } from "../../utils/math";

import styles from './SiteComponent.module.css';


const Sites: React.FC = () => {
    const { status } = useSession();

    if (status !== "authenticated") return null;

    return (
        <>
            <CreateSiteForm />
            <ShowSites />
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
                <div className={styles['form-card']}>
                    <h2>Create Site</h2>
                    <form className={styles['form-container']}
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
                        <label htmlFor="type">Type:</label>
                        <input
                            type="text"
                            placeholder="type"
                            value={type}
                            onChange={(event) => setType(event.target.value)}
                            id="type"
                        />
                        <label htmlFor="unarrayed-coordinates">Unarrayed Coordinates:</label>
                        <input
                            type="text"
                            placeholder="unarrayed coordinates"
                            value={unarrayedCoordinates}
                            onChange={(event) => setUnarrayedCoordinates(event.target.value)}
                            id="unarrayed-coordinates"
                        />
                        <label htmlFor="radius">Radius:</label>
                        <input
                            type="text"
                            placeholder="radius"
                            value={radius}
                            onChange={(event) => setRadius(event.target.value)}
                            id="radius"
                        />
                        <button type='submit'>Submit</button>
                    </form>
                </div>

            ) : (
                <p>Not LoggedIn</p>
            )}
        </>
    )
}

const ShowSites: React.FC = () => {
    const { data: sessionData } = useSession();

    const { data: sites, isLoading, refetch: refetchSites } =
        api.site.getAllSites.useQuery(undefined, { enabled: sessionData?.user !== undefined });

    const deleteSite = api.site.deleteSite.useMutation({
        onSuccess: () => {
            refetchSites();
        },
    });

    const handleDelete = async (siteId: string) => {
        try {
            await deleteSite.mutate({ siteId });
        } catch (error) {
            console.log(error);
        }
    };


    if (isLoading) {
        return <div>Fetching Sites...</div>;
    }




    return (
        <div className={styles.sitesContainer}>
            {sites?.data.map((site) => (
                <div key={site.id} className={styles.siteCard}>
                    <div className={styles.siteHeader}>
                        <p className={styles.siteHeaderText}>Site ID: {site.id}</p>
                    </div>
                    <div className={styles.siteBody}>
                        <p className={styles.siteContent}>Type: {site.type}</p>
                        <p className={styles.siteContent}>{JSON.stringify(site.geometry)}</p>
                        <p className={styles.siteContent}>Radius: {site.radius}</p>
                    </div>
                    <div className={styles.siteButtons}>
                        <button className={styles.siteEditButton}>Edit</button>
                        <button
                            className={styles.siteDeleteButton}
                            onClick={() => {
                                handleDelete(site.id);
                            }}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))
            }
        </div >
    );
};


export default Sites;