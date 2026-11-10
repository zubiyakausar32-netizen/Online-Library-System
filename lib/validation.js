function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function text(value, field, maxLength, minLength = 1) {
  if (typeof value !== 'string') {
    throw invalid(`${field} is required.`);
  }
  const result = value.trim();
  if (result.length < minLength || result.length > maxLength) {
    throw invalid(`${field} must be between ${minLength} and ${maxLength} characters.`);
  }
  return result;
}

function positiveInteger(value, field, maximum = 100000) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw invalid(`${field} must be a whole number between 1 and ${maximum}.`);
  }
  return number;
}

function id(value, field = 'ID') {
  return positiveInteger(value, field, 2147483647);
}

function email(value) {
  const result = text(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw invalid('Enter a valid email address.');
  }
  return result;
}

function phone(value, required = false) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    if (required) {
      throw invalid('Phone number is required.');
    }
    return null;
  }
  const result = text(value, 'Phone number', 30);
  const digits = result.replace(/\D/g, '');
  if (!/^\+?[0-9().\s-]+$/.test(result) || digits.length < 7 || digits.length > 15) {
    throw invalid('Enter a valid phone number with 7 to 15 digits.');
  }
  return result;
}

function password(value) {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72) {
    throw invalid('Password must be at least 8 characters and no more than 72 UTF-8 bytes.');
  }
  return value;
}

function isbn(value) {
  const result = text(value, 'ISBN', 20);
  const compact = result.replace(/[\s-]/g, '');
  if (!/^(?:\d{10}|\d{9}[\dXx]|\d{13})$/.test(compact)) {
    throw invalid('ISBN must contain 10 or 13 digits (an ISBN-10 may end in X).');
  }
  return result;
}

module.exports = { text, positiveInteger, id, email, phone, password, isbn };
