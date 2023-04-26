import React from "react";
import EditSiteForm from "./EditSiteForm";
import styles from "./SiteComponent.module.css";
import SiteDetails from "./SiteDetails";
import { Site } from "@prisma/client";

interface Props {
    site: Site;
    expandingSiteId: string | null;
    editingSiteId: string | null;
    handleExpand: (siteId: string) => void;
    handleEdit: (siteId: string) => void;
    handleDelete: (siteId: string) => void;
    setExpandingSiteId: (siteId: string | null) => void;
    setEditingSiteId: (siteId: string | null) => void;
}

const SingleSite: React.FC<Props> = ({
    site,
    expandingSiteId,
    editingSiteId,
    handleExpand,
    handleEdit,
    handleDelete,
    setExpandingSiteId,
    setEditingSiteId,
}) => {
    return (
        <div key={site.id} className={styles.siteCard}>
            <div className={styles.siteHeader}>
                <p className={styles.siteHeaderText}>Name: {site.name}</p>
            </div>
            <div className={styles.siteBody}>
                <p className={styles.siteContent}>Site ID: {site.id}</p>
                {expandingSiteId === site.id && (
                    <SiteDetails siteId={site.id} onClose={() => setExpandingSiteId(null)} />
                )}
                {editingSiteId === site.id && (
                    <EditSiteForm siteId={site.id} onClose={() => setEditingSiteId(null)} />
                )}
            </div>
            <div className={styles.siteButtons}>
                <button
                    className={styles.siteExpandButton}
                    onClick={() => {
                        handleExpand(site.id);
                    }}
                >
                    Expand
                </button>
                <button
                    className={styles.siteEditButton}
                    onClick={() => {
                        handleEdit(site.id);
                    }}
                >
                    Edit
                </button>
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
    );
};

export default SingleSite;

