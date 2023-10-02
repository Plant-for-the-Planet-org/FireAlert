// Checks if any destination phone number string falls among the restrictedCountries area code, 
// if yes, return true, else false 

import phone from 'phone';

const restrictedCountryCodes = [
    'RU', // Russia
    'TJ', // Tajikistan
    'MG', // Madagascar
    'ID', // Indonesia
    'PK', // Pakistan
    'AZ', // Azerbaijan
    'PS', // Palestinian Territory
    'LY', // Libya
    'UZ', // Uzbekistan
    'AF', // Afghanistan
    'BZ', // Belize
];

export const isPhoneNumberRestricted = (phoneNumber: string) => {
    const phoneResult = phone(phoneNumber);
    const countryCode = phoneResult.countryIso2 as string;
    return restrictedCountryCodes.includes(countryCode);
}