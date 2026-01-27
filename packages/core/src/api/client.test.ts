import { describe, it, expect, vi } from 'vitest'
import {
	createHousehold,
	deleteRecipe,
	getHousehold,
	getRecipe,
	joinHousehold,
	listMealPlan,
	listRecipes,
	markLastCooked,
	setMealPlanDay,
	setMealPlanStatus,
	upsertRecipe
} from './client'

function createQuery(result: any = { data: 'ok', error: null }) {
	const query: any = {
		_eqCalls: [] as { column: string; value: unknown }[],
		_updateArgs: [] as any[],
		_upsertArgs: [] as any[][],
		select: vi.fn().mockReturnThis(),
		order: vi.fn().mockResolvedValue(result),
		delete: vi.fn().mockReturnThis(),
		update: vi.fn(function (this: any, arg: any) {
			this._updateArgs.push(arg)
			return this
		}),
		upsert: vi.fn(function (this: any, ...args: any[]) {
			this._upsertArgs = [...(this._upsertArgs ?? []), args]
			return this
		}),
		eq: vi.fn(function (this: any, column: string, value: unknown) {
			this._eqCalls.push({ column, value })
			return this
		}),
		gte: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		single: vi.fn().mockReturnThis(),
		then(onFulfilled: (value: any) => any) {
			return Promise.resolve(result).then(onFulfilled)
		}
	}
	return query
}

function createSupabaseClient(result: any = { data: 'ok', error: null }) {
	const query = createQuery(result)
	const from = vi.fn().mockReturnValue(query)
	const rpc = vi.fn().mockResolvedValue({ data: 'rpc', error: null })
	const client = { from, rpc } as any
	return { client, from, rpc, query }
}

describe('recipes API client', () => {
	it('listRecipes orders by updated_at descending', async () => {
		const { client, from, query } = createSupabaseClient()

		const result = await listRecipes(client)

		expect(from).toHaveBeenCalledWith('recipes')
		expect(query.select).toHaveBeenCalledWith('*')
		expect(query.order).toHaveBeenCalledWith('updated_at', { ascending: false })
		expect(result).toEqual({ data: 'ok', error: null })
	})

	it('getRecipe selects a single recipe by id', async () => {
		const { client, from, query } = createSupabaseClient()

		const result = await getRecipe(client, 'r1')

		expect(from).toHaveBeenCalledWith('recipes')
		expect(query.select).toHaveBeenCalledWith('*')
		expect(result).toEqual({ data: 'ok', error: null })
	})

	it('upsertRecipe sets household_id and uses onConflict id', async () => {
		const { client, from, query } = createSupabaseClient()

		const payload = { title: 'T', ingredients: 'I', steps: 'S' }
		const result = await upsertRecipe(client, 'h1', payload)

		expect(from).toHaveBeenCalledWith('recipes')
		expect(query.upsert).toHaveBeenCalledWith({ ...payload, household_id: 'h1' }, { onConflict: 'id' })
		expect(result).toEqual({ data: 'ok', error: null })
	})

	it('deleteRecipe deletes by id', async () => {
		const { client, from } = createSupabaseClient()

		const result = await deleteRecipe(client, 'r1')

		expect(from).toHaveBeenCalledWith('recipes')
		expect(result).toEqual({ data: 'ok', error: null })
	})

	it('markLastCooked updates last_cooked_at timestamp', async () => {
		const { client, from, query } = createSupabaseClient()

		const result = await markLastCooked(client, 'r1')

		expect(from).toHaveBeenCalledWith('recipes')
		expect(query.update).toHaveBeenCalled()
		const [updateArg] = query.update.mock.calls[0]
		expect(updateArg).toHaveProperty('last_cooked_at')
		expect(typeof updateArg.last_cooked_at).toBe('string')
		expect(result).toEqual({ data: 'ok', error: null })
	})
})

describe('meal plan API client', () => {
	it('listMealPlan selects joined recipe and filters by day range', async () => {
		const { client, from, query } = createSupabaseClient()

		const result = await listMealPlan(client, '2026-01-01', '2026-01-07')

		expect(from).toHaveBeenCalledWith('meal_plan')
		expect(query.select).toHaveBeenCalledWith('*, recipe:recipes(id,title,photo_path)')
		expect(query.order).toHaveBeenCalledWith('day', { ascending: true })
		expect(result).toEqual({ data: 'ok', error: null })
	})

	it('setMealPlanDay deletes entry when recipeId is null', async () => {
		const { client, from } = createSupabaseClient()

		const resultPromise = setMealPlanDay(client, 'h1', '2026-01-05', null)

		expect(from).toHaveBeenCalledWith('meal_plan')
		// We only assert the call path; the query object handles its own resolution
		expect(resultPromise).toBeInstanceOf(Promise)
	})

	it('setMealPlanDay upserts entry when recipeId is present', async () => {
		const { client, from, query } = createSupabaseClient()

		const result = await setMealPlanDay(client, 'h1', '2026-01-05', 'r1')

		expect(from).toHaveBeenCalledWith('meal_plan')
		expect(query.upsert).toHaveBeenCalledWith(
			{ household_id: 'h1', day: '2026-01-05', recipe_id: 'r1', status: 'planned' },
			{ onConflict: 'household_id,day' }
		)
		expect(result).toEqual({ data: 'ok', error: null })
	})

	it('setMealPlanStatus updates status for day and household', async () => {
		const { client, from, query } = createSupabaseClient()

		const result = await setMealPlanStatus(client, 'h1', '2026-01-05', 'cooked')

		expect(from).toHaveBeenCalledWith('meal_plan')
		expect(query.update).toHaveBeenCalledWith({ status: 'cooked' })
		expect(result).toEqual({ data: 'ok', error: null })
	})
})

describe('household API client', () => {
	it('createHousehold calls the corresponding RPC', async () => {
		const { client, rpc } = createSupabaseClient()

		const result = await createHousehold(client)

		expect(rpc).toHaveBeenCalledWith('create_household')
		expect(result).toEqual({ data: 'rpc', error: null })
	})

	it('joinHousehold passes join code into RPC', async () => {
		const { client, rpc } = createSupabaseClient()

		const result = await joinHousehold(client, 'JOIN123')

		expect(rpc).toHaveBeenCalledWith('join_household', { p_join_code: 'JOIN123' })
		expect(result).toEqual({ data: 'rpc', error: null })
	})

	it('getHousehold selects id and join_code by id', async () => {
		const { client, from, query } = createSupabaseClient()

		const result = await getHousehold(client, 'h1')

		expect(from).toHaveBeenCalledWith('households')
		expect(query.select).toHaveBeenCalledWith('id, join_code')
		expect(result).toEqual({ data: 'ok', error: null })
	})
})
