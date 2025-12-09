
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://asukqilekjsuehcalduo.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

// 添加拦截器来记录所有网络请求
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
  },
  global: {
    fetch: (url, options = {}) => {
      console.log('Supabase fetch:', url);
      return fetch(url, options).catch(err => {
        console.error('Supabase fetch error:', err);
        throw err;
      });
    },
  },
});

export { supabase }