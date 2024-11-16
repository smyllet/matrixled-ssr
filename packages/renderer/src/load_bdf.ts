import { $Font, type Font } from 'bdfparser'

export class Fonts {
  private fonts: Map<string, Font> = new Map()

  constructor(private fileLoader: (file: string) => AsyncIterableIterator<string>) {}

  async get(fontPath: string) {
    const foundFont = this.fonts.get(fontPath)
    if (foundFont) {
      return foundFont
    }

    const font = await $Font(this.fileLoader(fontPath))
    this.fonts.set(fontPath, font)

    return font
  }
}
