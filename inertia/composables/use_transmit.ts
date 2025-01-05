import { Transmit } from '@adonisjs/transmit-client'

const transmit = new Transmit({
  baseUrl: window.location.origin,
})

export function useTransmit() {
  return transmit
}
