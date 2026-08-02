import test from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

test('Health Checks - Built-in Token Helper Validation', () => {
  const payload = { id: 'test_user_id', role: 'User' };
  const secret = 'test_secret_key';
  
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  assert.ok(token, 'JWT Token was not generated correctly');

  const decoded = jwt.verify(token, secret);
  assert.strictEqual(decoded.id, 'test_user_id', 'Decoded user ID does not match original');
  assert.strictEqual(decoded.role, 'User', 'Decoded role does not match original');
});

test('Health Checks - Hashing Validation Checks', async () => {
  const password = 'mySecurePassword123';
  const salt = await bcryptjs.genSalt(10);
  const hash = await bcryptjs.hash(password, salt);

  assert.ok(hash, 'Bcryptjs was not able to hash the password string');
  assert.notStrictEqual(hash, password, 'Hashed password string should not be equal to plain text');

  const isMatch = await bcryptjs.compare(password, hash);
  assert.strictEqual(isMatch, true, 'Bcryptjs password comparison verification failed');
});
