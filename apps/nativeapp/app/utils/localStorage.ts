import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Stores data in AsyncStorage by serializing it to JSON
 * Handles errors gracefully by logging them to console
 *
 * @param {string} key - The storage key to use
 * @param {any} value - The value to store (will be JSON stringified)
 * @returns {Promise<void>}
 *
 * @example
 * await storeData('user_preferences', { theme: 'dark', language: 'en' });
 */
export const storeData = async (key: string, value: any) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    // saving error
    console.log(e, 'store');
  }
};

/**
 * Retrieves and parses data from AsyncStorage
 * Returns undefined if the key doesn't exist or if parsing fails
 *
 * @param {string} key - The storage key to retrieve
 * @returns {Promise<any | undefined>} The parsed value or undefined
 *
 * @example
 * const preferences = await getData('user_preferences');
 * // Returns: { theme: 'dark', language: 'en' } or undefined
 */
export const getData = async (key: string) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      // value previously stored
      return JSON.parse(value);
    }
  } catch (e) {
    // error reading value
    console.log(e, 'getData');
  }
};

/**
 * Clears all data from AsyncStorage
 * Logs "Done." to console when complete
 *
 * @returns {Promise<void>}
 *
 * @example
 * await clearAll(); // Removes all stored data
 */
export const clearAll = async () => {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    // clear error
  }
  console.log('Done.');
};
