import { useSession } from "next-auth/react";
import { useState } from "react";
import { api } from "../../utils/api";
import { makeCoordinates } from "../../utils/math";
import styles from './SiteComponent.module.css';
import  SingleSite  from "./SingleSite";


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
    const [name, setName] = useState('')
    const { data: session, status } = useSession()
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
                                name: name,
                            })
                            setType('')
                            setUnarrayedCoordinates('')
                            setRadius('')
                            setName('')
                        }}>
                        <label htmlFor="radius">Name:</label>
                        <input
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            id="name"
                        />
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
    const [expandingSiteId, setExpandingSiteId] = useState<string | null>(null);
    const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
    const { data: sessionData } = useSession();

    const { data: sites, isLoading, refetch: refetchSites } =
        api.site.getAllSites.useQuery(undefined, { enabled: sessionData?.user !== undefined });

    const deleteSite = api.site.deleteSite.useMutation({
        onSuccess: () => {
            refetchSites();
        },
    });

    const handleExpand = (siteId: string) => {
        setExpandingSiteId(siteId);
    };

    const handleEdit = (siteId: string) => {
        setEditingSiteId(siteId);
    };

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
                <SingleSite
                    key={site.id}
                    site={site}
                    expandingSiteId={expandingSiteId}
                    editingSiteId={editingSiteId}
                    handleExpand={handleExpand}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    setExpandingSiteId={setExpandingSiteId}
                    setEditingSiteId={setEditingSiteId}
                />
            ))}
        </div>
    );
};


export default Sites;