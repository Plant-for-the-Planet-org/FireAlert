import {env} from '../env.mjs';
import {type BaseProjectExtended, type BaseUser} from '@planet-sdk/common';

interface PlanetUser {
  id: string;
  isPlanetRO: boolean;
  name: string;
}

// Fetch User from PlanetAPI, if user exists return id and isPlanetRO else return false.
export const planetUser = async (bearer_token: string): Promise<PlanetUser> => {
  try {
    const response = await fetch(`${env.PLANET_API_URL}/app/profile`, {
      headers: {
        Authorization: bearer_token,
      },
    });
    const data: BaseUser = await response.json();
    return {
      id: data.id,
      isPlanetRO: data.type === 'tpo',
      name: data.displayName,
    };
  } catch (error) {
    console.error(error);
    return {
      id: '',
      isPlanetRO: false,
      name: '',
    };
    //Todo: identify whether we should return error or simply ignore the fact that we couldn't fetch the user.
  }
};

export const fetchProjectsWithSitesForUser = async (bearer_token: string) => {
  // fetch data from https://app.plant-for-the-planet.org/app/profile/projects?_scope=sites with authorization headers of Bearer token using bearer_token
  // This results an array of projects which has sites key to it which contains an array of sites
  // return this list
  const response = await fetch(
    `${env.PLANET_API_URL}/app/profile/projects?_scope=extended`,
    {
      headers: {
        Authorization: bearer_token,
        'X-SESSION-ID': 'firealert-nextjs',
      },
    },
  );
  const data = await response.json();
  return data;
};

export const fetchAllProjectsWithSites = async () => {
  const response = await fetch(
      `${env.PLANET_API_URL}/app/projects?_scope=extended&filter[purpose]=trees,conservation`,
    );
  const data = await response.json();
  return data;
};

export const getNameFromPPApi = async (
  bearer_token: string,
): Promise<string> => {
  const initialUrl = `https://app.plant-for-the-planet.org/app/profile`;
  try {
    let response = await fetch(initialUrl, {
      headers: {
        Authorization: bearer_token,
        'X-SESSION-ID': 'firealert-nextjs',
      },
    });

    if (response.status === 303) {
      const redirectUrl = response.headers.get('Location')!;
      response = await fetch(redirectUrl, {
        headers: {
          Authorization: bearer_token,
          'X-SESSION-ID': 'firealert-nextjs',
        },
      });
    }
    if (response.ok) {
      const data = await response.json();
      if (data.name) {
        return data.name;
      } else if (data.firstname && data.lastname) {
        const name = data.firstname + ' ' + data.lastname;
        return name;
      } else if (data.firstname || data.lastname) {
        const firstname = data.firstname || '';
        const lastname = data.lastname || '';
        const name = firstname + ' ' + lastname;
        return name;
      }
    } else {
      console.error(
        `Error fetching profile data: Error: HTTP error! status: ${response.status}`,
      );
      return '';
    }
    return '';
  } catch (error) {
    console.error(`Error fetching profile data: ${error}`);
    return '';
  }
};
