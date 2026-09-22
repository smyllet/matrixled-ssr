/**
 * A refused request carries why it was refused: the API answers a 422 with
 * `{ errors: [{ field, message, rule }] }`, and the services word those
 * messages on purpose — "The device geometry (96x48) is not an integer
 * multiple of the scene geometry (64x32)" is worth reading, "unknown error"
 * is not.
 *
 * Read defensively: a network failure, a 500 or a proxy error page carry
 * nothing of the sort, and those are the cases the generic message is for.
 */
export function validationMessage(error: unknown): string | null {
  const response = (error as { response?: unknown })?.response
  const errors = (response as { errors?: unknown })?.errors

  if (!Array.isArray(errors)) return null

  const message = (errors[0] as { message?: unknown })?.message

  return typeof message === 'string' && message.length > 0 ? message : null
}
