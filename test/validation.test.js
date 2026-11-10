const test = require('node:test');
const assert = require('node:assert/strict');
const { email, id, isbn, password, phone, positiveInteger, text } = require('../lib/validation');

test('normalizes validated email addresses', () => {
  assert.equal(email('  Reader@example.com '), 'reader@example.com');
  assert.throws(() => email('not-an-email'), { status: 400 });
});

test('validates positive IDs and copy counts', () => {
  assert.equal(id('12'), 12);
  assert.equal(positiveInteger(5, 'Copies'), 5);
  assert.throws(() => id('0'), { status: 400 });
  assert.throws(() => positiveInteger(1.5, 'Copies'), { status: 400 });
});

test('validates text, passwords, and common ISBN formats', () => {
  assert.equal(text('  A title ', 'Title', 20), 'A title');
  assert.equal(password('correct horse'), 'correct horse');
  assert.equal(isbn('978-0-14-143951-8'), '978-0-14-143951-8');
  assert.throws(() => password('short'), { status: 400 });
  assert.throws(() => password('😀'.repeat(19)), { status: 400 });
  assert.throws(() => isbn('1234'), { status: 400 });
  assert.throws(() => text(' ', 'Title', 20), { status: 400 });
});

test('validates required and optional phone numbers', () => {
  assert.equal(phone(''), null);
  assert.equal(phone('+1 (555) 123-4567'), '+1 (555) 123-4567');
  assert.throws(() => phone('', true), { status: 400, message: 'Phone number is required.' });
  assert.throws(() => phone(undefined, true), { status: 400, message: 'Phone number is required.' });
  assert.equal(phone('+1 555 123 4567', true), '+1 555 123 4567');
  assert.throws(() => phone('123-ABC'), { status: 400 });
  assert.throws(() => phone('1234567890123456'), { status: 400 });
});
