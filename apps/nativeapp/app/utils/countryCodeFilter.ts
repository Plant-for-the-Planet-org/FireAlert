import {countryCode} from '../constants/countryCodes';

interface PhoneNumberData {
  countryCode: string;
  remainingNumber: string;
}

export const extractCountryCode = (phoneNumber: string): PhoneNumberData => {
  // Define the maximum length of the country code
  const maxCountryCodeLength: number = 4;

  // Iterate through the phone number to find the potential country code
  for (let i = 1; i <= maxCountryCodeLength; i++) {
    const potentialCountryCode: string = phoneNumber.substring(0, i);

    // Check if the potential country code exists in the country codes dataset
    if (countryCode.filter(el => el.dialCode === potentialCountryCode).length) {
      const remainingNumber: string = phoneNumber.substring(i);
      return {countryCode: potentialCountryCode, remainingNumber};
    }
  }

  // Return an empty string if no potential country code is found
  return {countryCode: '', remainingNumber: phoneNumber};
};
