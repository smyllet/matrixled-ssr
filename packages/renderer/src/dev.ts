import fetchline from 'fetchline'
import { Renderer } from './renderer.ts'
import { Fonts } from './fonts.ts'
import { Gif } from './components/gif.ts'

const canvas = document.getElementById('renderer') as HTMLCanvasElement
canvas.width = 64
canvas.height = 32
applyMaskOn(canvas)

const fonts = new Fonts(fetchline)

const gif = await fetch('pacman-small.gif').then((res) => res.arrayBuffer())
const font = await fonts.get('bitbuntu-full.bdf')

const getDisplayTime = () => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

const renderer = new Renderer(canvas, fonts, (width, height) => {
  const newCanvas = document.createElement('canvas')
  newCanvas.width = width
  newCanvas.height = height
  return newCanvas
})
const gifComponent = new Gif(renderer, gif)

let frame = 0
let lastTime = 0
render(0)

function render(time: number) {
  const delta = time - lastTime
  renderer.clear()

  gifComponent.render(delta)
  renderer.drawBitmapText(font, getDisplayTime(), 17, 1, {})

  lastTime = time
  frame++
  requestAnimationFrame(render)
}

function applyMaskOn(maskTarget: HTMLCanvasElement) {
  const maskElement = document.getElementById('mask')
  if (!maskElement) {
    throw new Error('Mask element not found')
  }

  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = maskTarget.getBoundingClientRect()

    maskElement.style.width = `${width}px`
    maskElement.style.height = `${height}px`
    maskElement.style.backgroundSize = `${(1 / maskTarget.width) * 100}%`
  }).observe(maskTarget)
  return { maskElement, resizeObserver }
}
