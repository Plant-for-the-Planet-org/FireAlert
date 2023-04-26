import { api } from "../../utils/api";
import styles from './SiteComponent.module.css';

type SiteDetailsProps = {
    siteId: string;
    onClose: () => void;
};

const SiteDetails: React.FC<SiteDetailsProps> = ({
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
    return (
        <div>
            <h2>{siteData.name}</h2>
            <p>Site ID: {siteData.id}</p>
            <p>Type: {siteData.type}</p>
            <p>Geometry: {JSON.stringify(siteData.geometry)}</p>
            <p>Radius: {siteData.radius}</p>
            <button className={styles.siteCloseButton} onClick={onClose}>Close</button>
        </div>
    );
};

export default SiteDetails;