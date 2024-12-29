const client = new WebSocket('ws://localhost:3333')

export function useWebsocket() {
  return client
}
