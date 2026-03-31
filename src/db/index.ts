import { SupabaseAdapter } from "./supabase-adapter";
import { IDatabaseAdapter } from "./interfaces";

export const db: IDatabaseAdapter = new SupabaseAdapter()