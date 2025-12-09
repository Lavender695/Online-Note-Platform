// 简单的Supabase连接测试脚本
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://asukqilekjsuehcalduo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdWtxaWxla2pzdWVoY2FsZHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjQ1MzUsImV4cCI6MjA3OTY0MDUzNX0.SoUC709A2iSrwKiGtKPnbjO5XuVE2-0O1LWDTfHW5tk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // 测试认证
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Auth error:', authError);
    } else {
      console.log('Auth session:', authData);
    }
    
    // 测试简单查询
    const { data, error } = await supabase.from('notes').select('*').limit(1);
    
    if (error) {
      console.error('Query error:', error);
    } else {
      console.log('Query result:', data);
    }
    
  } catch (err) {
    console.error('General error:', err);
  }
}

testConnection();