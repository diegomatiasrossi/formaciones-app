import { describe, it, expect } from 'vitest'
import { generateFormation, formationGenerators } from './formations'
import type { FormationId } from '@/types'

const FORMATION_IDS = Object.keys(formationGenerators) as FormationId[]

describe('generateFormation', () => {
  it.each(FORMATION_IDS)('genera exactamente n puntos para %s', (id) => {
    const n = 12
    const pts = generateFormation(id, n, 400, 280, 40)
    expect(pts).toHaveLength(n)
  })

  it.each(FORMATION_IDS)('respeta el máximo de 50 para %s', (id) => {
    const pts = generateFormation(id, 99, 400, 280, 40)
    expect(pts.length).toBeLessThanOrEqual(50)
  })

  it.each(FORMATION_IDS)('respeta el mínimo de 1 para %s', (id) => {
    const pts = generateFormation(id, 0, 400, 280, 40)
    expect(pts.length).toBeGreaterThanOrEqual(1)
  })

  it.each(FORMATION_IDS)('los puntos tienen coordenadas numéricas para %s', (id) => {
    const pts = generateFormation(id, 8, 400, 280, 40)
    pts.forEach(p => {
      expect(typeof p.x).toBe('number')
      expect(typeof p.y).toBe('number')
      expect(isNaN(p.x)).toBe(false)
      expect(isNaN(p.y)).toBe(false)
    })
  })

  it('círculo distribuye los puntos equidistantes', () => {
    const pts = generateFormation('circle', 8, 400, 280, 40)
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
    const radii = pts.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2))
    const minR = Math.min(...radii)
    const maxR = Math.max(...radii)
    // todos a distancia similar del centro
    expect(maxR - minR).toBeLessThan(5)
  })

  it('línea horizontal tiene la misma y para todos los puntos', () => {
    const pts = generateFormation('line-h', 10, 400, 280, 40)
    const ys = pts.map(p => p.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(2)
  })

  it('línea vertical tiene la misma x para todos los puntos', () => {
    const pts = generateFormation('line-v', 10, 400, 280, 40)
    const xs = pts.map(p => p.x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(2)
  })
})
