import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password';

test('hash confere com a senha correta e rejeita a errada', async () => {
  const hash = await hashPassword('senha1234');
  assert.notEqual(hash, 'senha1234');
  assert.equal(await verifyPassword('senha1234', hash), true);
  assert.equal(await verifyPassword('outra9999', hash), false);
});
