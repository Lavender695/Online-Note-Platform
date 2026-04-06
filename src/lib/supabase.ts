
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const getSupabaseEnv = () => {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			'Missing Supabase env. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
		)
	}

	return { supabaseUrl, supabaseAnonKey }
}

const createPublicSupabaseClient = (clerkToken?: string) => {
	const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()

	return createClient(supabaseUrl, supabaseAnonKey, {
		global: clerkToken
			? {
				headers: {
					Authorization: `Bearer ${clerkToken}`,
				},
			}
			: undefined,
	})
}

let sharedClient: SupabaseClient | null = null

export const getSupabaseClient = () => {
	if (!sharedClient) {
		sharedClient = createPublicSupabaseClient()
	}

	return sharedClient
}

export const supabase = new Proxy({} as SupabaseClient, {
	get(_target, property, receiver) {
		return Reflect.get(getSupabaseClient(), property, receiver)
	},
})

export const createClerkSupabaseClient = (clerkToken: string) =>
	createPublicSupabaseClient(clerkToken)