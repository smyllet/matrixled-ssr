import User from '#models/user'
import { test } from '@japa/runner'

const account = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.test',
  password: 'secret123',
  passwordConfirmation: 'secret123',
}

test.group('Signup', () => {
  test('creates a user account', async ({ client, assert }) => {
    const response = await client.post('/api/v1/auth/signup').json(account)

    response.assertStatus(200)
    assert.isNotNull(await User.findBy('email', account.email))
  })

  test('starts from an empty users table', async ({ client }) => {
    /**
     * Same address as the previous test. `users.email` is unique, so this only
     * passes if the tables were truncated in between.
     */
    const response = await client.post('/api/v1/auth/signup').json(account)

    response.assertStatus(200)
  })
})
