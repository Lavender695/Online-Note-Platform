import { MockDatabase } from "./mock-adapter";
import { SupabaseAdapter } from "./supabase-adapter";
import { IDatabaseAdapter } from "./interfaces";

const useMock = process.env.NEXT_PUBLICK_USE_MOCK === 'true'

export const db: IDatabaseAdapter = useMock ? new MockDatabase() : new SupabaseAdapter()