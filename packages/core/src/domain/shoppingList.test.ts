import { describe, expect, it } from 'vitest'
import { buildShoppingListFromPlan, parseIngredientLine } from './shoppingList'

describe('parseIngredientLine', () => {
  it('parses qty + unit', () => {
    const r = parseIngredientLine('250 g Nudeln')
    expect(r?.qty).toBe(250)
    expect(r?.unit).toBe('g')
    expect(r?.name.toLowerCase()).toContain('nudeln')
  })

  it('parses decimal comma', () => {
    const r = parseIngredientLine('1,5 l Milch')
    expect(r?.qty).toBe(1.5)
    expect(r?.unit).toBe('l')
  })

  it('handles free text', () => {
    const r = parseIngredientLine('Salz & Pfeffer')
    expect(r?.qty).toBe(null)
    expect(r?.unit).toBe(null)
    expect(r?.raw).toBe('Salz & Pfeffer')
  })
})

describe('buildShoppingListFromPlan', () => {
  it('aggregates same ingredient (same unit)', () => {
    const plan = [
      { id: 'p1', household_id: 'h1', day: '2026-01-12', recipe_id: 'r1', status: 'planned', created_at: '', updated_at: '' },
      { id: 'p2', household_id: 'h1', day: '2026-01-13', recipe_id: 'r2', status: 'planned', created_at: '', updated_at: '' }
    ]

    const recipes = new Map([
      [
        'r1',
        {
          id: 'r1',
          household_id: 'h1',
          title: 'A',
          portions: null,
          ingredients: '200 g Nudeln\n1 x Tomaten',
          steps: '',
          notes: '',
          photo_path: null,
          is_favorite: false,
          tags: [],
          last_cooked_at: null,
          created_at: '',
          updated_at: ''
        }
      ],
      [
        'r2',
        {
          id: 'r2',
          household_id: 'h1',
          title: 'B',
          portions: null,
          ingredients: '100 g Nudeln',
          steps: '',
          notes: '',
          photo_path: null,
          is_favorite: false,
          tags: [],
          last_cooked_at: null,
          created_at: '',
          updated_at: ''
        }
      ]
    ])

    const list = buildShoppingListFromPlan(plan as any, recipes as any)
    const noodles = list.find((i) => i.norm.includes('nudeln'))
    expect(noodles?.qty).toBe(300)
    expect(noodles?.unit).toBe('g')
  })
})
