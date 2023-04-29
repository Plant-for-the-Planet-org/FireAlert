export const checkIfUserIsPlanetRO = async (
    bearer_token: string
): Promise<boolean> => {
    try {
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
    } catch (error) {
        console.error(error);
        return false;
    }
};

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


export const getNameFromPPApi = async (bearer_token: string): Promise<string> => {
    const initialUrl = "https://app.plant-for-the-planet.org/app/profile";
    try {
        let response = await fetch(initialUrl, {
            headers: {
                Authorization: bearer_token,
            },
        });

        if (response.status === 303) {
            const redirectUrl = response.headers.get("Location")!;
            response = await fetch(redirectUrl, {
                headers: {
                    Authorization: bearer_token,
                },
            });
        }
        if (response.ok) {
            const data = await response.json();
            if(data.name){
                return data.name;
            }else if(data.firstname && data.lastname){
                const name = data.firstname + " " + data.lastname
                return name
            }else if(data.firstname || data.lastname){
                const firstname = data.firstname || ""
                const lastname = data.lastname || ""
                const name = firstname + " " + lastname
                return name
            }
        } else {
            console.error(`Error fetching profile data: Error: HTTP error! status: ${response.status}`);
            return "";
        }
    } catch (error) {
        console.error(`Error fetching profile data: ${error}`);
        return "";
    }
};


