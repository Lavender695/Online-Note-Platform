import { supabase } from '../../../lib/supabase';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create a new note
  if (req.method === 'POST') {
    const { title, content, user_id } = req.body; // 接收 user_id
    const { data, error } = await supabase.from('notes').insert([{ title, content, user_id }]);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }
  
  // Get all notes
  if (req.method === 'GET') {
    const { id } = req.query;
    
    // Get a single note by ID
    if (id) {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
    
    // Get all notes
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }
}