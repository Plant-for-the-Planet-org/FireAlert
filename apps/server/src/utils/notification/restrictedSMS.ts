// Checks if any destination phone number string falls among the restrictedCountries area code, 
// if yes, return true, else false 

import phone from 'phone';

const restrictedCountryCodesSms = [
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

const restrictedCountryCodesWhatsapp = [
    'IN', // India
]

export const isPhoneNumberRestricted = (alertMethodMethod: string, phoneNumber: string) => {
    const phoneResult = phone(phoneNumber);
    const countryCode = phoneResult.countryIso2 as string;
    if(alertMethodMethod === 'sms'){
        return restrictedCountryCodesSms.includes(countryCode);
    } else if (alertMethodMethod === 'whatsapp'){
        return restrictedCountryCodesWhatsapp.includes(countryCode);
    }
}