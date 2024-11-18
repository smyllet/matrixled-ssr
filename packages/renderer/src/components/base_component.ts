import { Renderer } from '../renderer'

export abstract class BaseComponent {
  constructor(public renderer: Renderer) {}

  abstract render(time: number): void
}
