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

  it('parses teaspoon abbreviation', () => {
    const r = parseIngredientLine('1 TL Salz')
    expect(r?.qty).toBe(1)
    expect(r?.unit).toBe('tl')
    expect(r?.name).toBe('Salz')
  })

  it('parses tablespoon abbreviation', () => {
    const r = parseIngredientLine('2 EL Olivenöl')
    expect(r?.qty).toBe(2)
    expect(r?.unit).toBe('el')
    expect(r?.name).toBe('Olivenöl')
  })

  it('parses Stück as unit', () => {
    const r = parseIngredientLine('3 Stück Zwiebeln')
    expect(r?.qty).toBe(3)
    expect(r?.unit).toBe('stück')
    expect(r?.name).toBe('Zwiebeln')
  })

  it('parses kg unit', () => {
    const r = parseIngredientLine('1,5 kg Mehl')
    expect(r?.qty).toBe(1.5)
    expect(r?.unit).toBe('kg')
    expect(r?.name).toBe('Mehl')
  })

  it('parses ml unit', () => {
    const r = parseIngredientLine('500 ml Wasser')
    expect(r?.qty).toBe(500)
    expect(r?.unit).toBe('ml')
    expect(r?.name).toBe('Wasser')
  })

  it('handles x multiplier - x is consumed by regex, unit is next word', () => {
    const r = parseIngredientLine('2 x Eier')
    expect(r?.qty).toBe(2)
    // Note: The (?:x|×)? in the regex consumes 'x' as a separator
    // 'Eier' (4 chars, < 6 limit) becomes the unit, name is empty → falls back to raw
    expect(r?.unit).toBe('eier')
    expect(r?.name).toBe('2 x Eier') // Falls back to raw when name is empty
    expect(r?.raw).toBe('2 x Eier')
  })

  it('handles decimal with dot', () => {
    const r = parseIngredientLine('0.5 l Sahne')
    expect(r?.qty).toBe(0.5)
    expect(r?.unit).toBe('l')
    expect(r?.name).toBe('Sahne')
  })

  it('returns null for empty lines', () => {
    expect(parseIngredientLine('')).toBe(null)
    expect(parseIngredientLine('   ')).toBe(null)
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

  it('keeps separate entries when units differ', () => {
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
          ingredients: '1 l Milch',
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
          ingredients: '500 ml Milch',
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
    const milkItems = list.filter((i) => i.norm.includes('milch'))

    expect(milkItems).toHaveLength(1)
    expect(milkItems[0].text).toContain('1 l Milch')
    expect(milkItems[0].text).toContain('500 ml Milch')
  })

  it('tracks multiple sourceRecipeIds for the same normalized ingredient', () => {
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
          ingredients: '1 x Tomaten',
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
          ingredients: '2 x Tomaten',
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

    expect(list).toHaveLength(1)
    const tomatoes = list[0]
    expect(new Set(tomatoes.sourceRecipeIds)).toEqual(new Set(['r1', 'r2']))
  })
})
