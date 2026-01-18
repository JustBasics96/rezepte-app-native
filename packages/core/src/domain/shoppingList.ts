import type { MealPlanItem, Recipe } from '../api/types'
import { makeId } from '../utils/id'

export type ShoppingItem = {
  id: string
  text: string
  norm: string
  qty: number | null
  unit: string | null
  checked: boolean
  sourceRecipeIds: string[]
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/\([^\)]*\)/g, '')
    .replace(/[^a-zA-Z0-9äöüß ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseIngredientLine(line: string) {
  const raw = line.trim()
  if (!raw) return null

  // Examples:
  // "2 x Tomaten" -> qty 2, unit null, name "Tomaten"
  // "250 g Nudeln" -> qty 250, unit "g", name "Nudeln"
  // "1.5 l Milch" -> qty 1.5, unit "l", name "Milch"
  const m = raw.match(/^\s*(\d+(?:[\.,]\d+)?)\s*(?:x|×)?\s*([a-zA-Zäöüß]{1,6})?\s*(.*)$/)
  if (m) {
    const qty = Number(m[1].replace(',', '.'))
    const unit = m[2] ? m[2].toLowerCase() : null
    const name = (m[3] || '').trim() || raw
    return { qty: Number.isFinite(qty) ? qty : null, unit, name, raw }
  }

  return { qty: null, unit: null, name: raw, raw }
}

export function buildShoppingListFromPlan(plan: MealPlanItem[], recipesById: Map<string, Recipe>) {
  const lines: { recipeId: string; line: string }[] = []

  for (const p of plan) {
    const r = recipesById.get(p.recipe_id)
    if (!r) continue
    const ingredientLines = (r.ingredients || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)

    for (const line of ingredientLines) lines.push({ recipeId: r.id, line })
  }

  const byNorm = new Map<string, ShoppingItem>()

  for (const entry of lines) {
    const parsed = parseIngredientLine(entry.line)
    if (!parsed) continue

    const norm = normalizeName(parsed.name)
    if (!norm) continue

    const existing = byNorm.get(norm)
    if (!existing) {
      byNorm.set(norm, {
        id: makeId(),
        text: parsed.raw,
        norm,
        qty: parsed.qty,
        unit: parsed.unit,
        checked: false,
        sourceRecipeIds: [entry.recipeId]
      })
      continue
    }

    if (!existing.sourceRecipeIds.includes(entry.recipeId)) existing.sourceRecipeIds.push(entry.recipeId)

    // Try to sum quantities if units match and both qty exist
    if (existing.qty != null && parsed.qty != null && (existing.unit || '') === (parsed.unit || '')) {
      existing.qty = existing.qty + parsed.qty
      existing.text = `${existing.qty} ${existing.unit ?? ''} ${parsed.name}`.replace(/\s+/g, ' ').trim()
    } else {
      // Fallback: keep original text but don't lose information
      if (!existing.text.includes(' / ')) existing.text = `${existing.text} / ${parsed.raw}`
      else existing.text = `${existing.text}; ${parsed.raw}`
    }
  }

  return [...byNorm.values()].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1
    return a.norm.localeCompare(b.norm)
  })
}
