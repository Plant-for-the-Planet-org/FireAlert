export const checkIfUserIsPlanetRO = async (bearer_token: string) => {
    // send a request to https://app.plant-for-the-planet.org/app/profile with authorization headers of Bearer token using bearer_token
    // Check the response the the above request for type = "tpo"
    // If yes return true, else return false
    const response = await fetch(
        "https://app-staging.plant-for-the-planet.org/app/profile",
        {
            headers: {
                Authorization: bearer_token,
            },
        }
    );
    const data = await response.json();
    return data.type === "tpo";
}

export const fetchProjectsWithSitesForUser = async (bearer_token: string) => {
    // fetch data from https://app.plant-for-the-planet.org/app/profile/projects?_scope=sites with authorization headers of Bearer token using bearer_token
    // This results an array of projects which has sites key to it which contains an array of sites
    // return this list
    const response = await fetch(
        "https://app-staging.plant-for-the-planet.org/app/profile/projects?_scope=extended",
        {
            headers: {
                Authorization: bearer_token,
            },
        }
    );
    const data = await response.json();
    return data;
}

export const fetchAllProjectsWithSites = async () => {
    const response = await fetch("https://app-staging.plant-for-the-planet.org/app/projects?_scope=extended");
    const data = await response.json();
    return data;
}

type ProfileData = {
    name: string;
};

export const getNameFromPPApi = async (
    bearer_token: string
): Promise<ProfileData> => {
    const response = await fetch(
        "https://app.plant-for-the-planet.org/app/profile",
        {
            headers: {
                Authorization: bearer_token,
            },
        }
    );
    const data = await response.json();
    return { name: data.name };
};