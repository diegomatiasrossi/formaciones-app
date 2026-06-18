import { describe, it, expect } from 'vitest'
import { snapToGrid, rotatePoint, mirrorPointH, mirrorPointV, distance } from './geometry'

describe('snapToGrid', () => {
  it('ajusta al múltiplo más cercano', () => {
    expect(snapToGrid(13, 10)).toBe(10)
    expect(snapToGrid(17, 10)).toBe(20)
    expect(snapToGrid(15, 10)).toBe(20)
  })
})

describe('rotatePoint', () => {
  it('rotación de 180° invierte el punto respecto al centro', () => {
    const { x, y } = rotatePoint(300, 200, 400, 280, 180)
    expect(x).toBeCloseTo(500, 0)
    expect(y).toBeCloseTo(360, 0)
  })

  it('rotación de 0° no mueve el punto', () => {
    const { x, y } = rotatePoint(300, 200, 400, 280, 0)
    expect(x).toBe(300)
    expect(y).toBe(200)
  })
})

describe('mirrorPointH', () => {
  it('refleja respecto al centro x', () => {
    expect(mirrorPointH(100, 400)).toBe(700)
    expect(mirrorPointH(400, 400)).toBe(400)
  })
})

describe('mirrorPointV', () => {
  it('refleja respecto al centro y', () => {
    expect(mirrorPointV(100, 280)).toBe(460)
  })
})

describe('distance', () => {
  it('distancia entre puntos', () => {
    expect(distance(0, 0, 3, 4)).toBe(5)
  })
})
