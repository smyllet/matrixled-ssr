import User from '#models/user'

let sequence = 0

/**
 * The suite truncates between tests, so the counter is only there to keep two
 * users created by the same test apart.
 */
export async function createUser() {
  sequence += 1

  return User.create({
    fullName: 'Ada Lovelace',
    email: `ada-${sequence}@example.test`,
    password: 'secret123',
  })
}
