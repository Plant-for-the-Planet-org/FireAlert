/**
 * Validates an email address using a basic regex pattern
 * Checks for the presence of non-whitespace characters, @ symbol, and domain
 *
 * @param {string} email - The email address to validate
 * @returns {boolean} True if the email matches the pattern, false otherwise
 *
 * @example
 * validateEmail('user@example.com'); // Returns: true
 * validateEmail('invalid.email'); // Returns: false
 * validateEmail('user@domain'); // Returns: false
 */
export const validateEmail = email => {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
};
