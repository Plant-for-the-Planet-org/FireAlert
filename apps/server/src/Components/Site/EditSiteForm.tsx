import { useState } from "react"
import styles from './SiteComponent.module.css';
import { api } from "../../utils/api";
import { makeCoordinates, makeUnarrayedCoordinates } from "../../utils/notification/otp";

type SiteDetailsProps = {
    siteId: string;
    onClose: () => void;
};

function useSiteData(siteData) {
    const [type, setType] = useState(siteData.type!)
    const previousCoordinates = makeUnarrayedCoordinates(siteData.geometry)
    const [unarrayedCoordinates, setUnarrayedCoordinates] = useState(previousCoordinates)
    const [radius, setRadius] = useState(siteData.radius!)
    const [name, setName] = useState(siteData.name)

    return { type, setType, unarrayedCoordinates, setUnarrayedCoordinates, radius, setRadius, name, setName }
}

const EditSiteForm: React.FC<SiteDetailsProps> = ({
    siteId,
    onClose,
}) => {
    const { data: site, isLoading } = api.site.getSite.useQuery({
        siteId,
    });
    if (isLoading) {
        return <div>Loading...</div>;
    }
    const siteData = site!.data
    const { type, setType, unarrayedCoordinates, setUnarrayedCoordinates, radius, setRadius, name, setName } = useSiteData(siteData)

    const postSite = api.site.updateSite.useMutation({
        onSuccess: () => {
            //render the Site component!
            console.log('success')
        }
    })
    return (
        <>
            <div className={styles['form-card-edit']}>
                <h2>Create Site</h2>
                <form className={styles['form-container']}
                    onSubmit={(event) => {
                        event.preventDefault()
                        const coordinates = makeCoordinates(unarrayedCoordinates)

                        const geometry = { type: type, coordinates: coordinates }
                        postSite.mutate({
                            params: {
                                siteId: siteData.id
                            },
                            body: {
                                type: type,
                                geometry: geometry,
                                radius: radius,
                                name: name,
                            }
                        })
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
                    <button type='submit'>Update Site</button>
                </form>
                <button className={styles.siteCloseButton} onClick={onClose}>Close</button>
            </div>
        </>
    )
}

export default EditSiteForm;