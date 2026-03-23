import { IDatabaseAdapter, User, Note } from "./interfaces";
import { supabase } from "@/lib/supabase";

export class SupabaseAdapter implements IDatabaseAdapter {
  // 获取用户
  async getUser(id: string): Promise<User | null> {
    const { data, error } = await supabase
    .from('user')
    .select('*')
    .eq('id', id)
    .single()

    if (error || !data) return null
    return data
  }

  // 获取笔记
  async getNotes(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)

    if (error || !data) return []

    return data.map(n => ({
      id: n.id,
      userId: n.user_id,
      content: n.content
    }))
  }

  // 创建笔记
  async createNote(userId: string, content: string): Promise<Note> {
    const { data, error } = await supabase
    .from('notes')
    .insert({user_id: userId, content})
    .select()  // 告诉supabase把插入的数据返回
    .single()  // 只返回一条

    if (error) {
      console.error("创建笔记失败：", error)
      throw new Error("创建笔记失败")
    }

    return {
      id: data.id,
      userId: data.user_id,
      content: data.content
    }
  }

  async deleteNote(id: string): Promise<void> {
    await supabase.from('notes').delete().eq('id', id)
  }
}