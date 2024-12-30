const client = new WebSocket('ws://localhost:3333/ws')

export function useWebsocket() {
  return client
}
