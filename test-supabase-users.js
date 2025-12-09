// 测试Supabase用户数据访问
import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
// 注意：在实际项目中，不要硬编码API密钥，这里只是为了测试
const supabaseUrl = 'https://asukqilekjsuehcalduo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdWtxaWxla2pzdWVoY2FsZHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjQ1MzUsImV4cCI6MjA3OTY0MDUzNX0.SoUC709A2iSrwKiGtKPnbjO5XuVE2-0O1LWDTfHW5tk';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

if (!supabaseKey) {
  console.error('No Supabase key found!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsersAccess() {
  try {
    console.log('\n--- 测试1: 检查数据库连接 ---');
    console.log('使用的Supabase URL:', supabaseUrl);
    console.log('使用的API Key:', supabaseKey.substring(0, 20) + '...' + supabaseKey.substring(supabaseKey.length - 5));
    
    console.log('\n--- 测试2: 使用information_schema列出所有表 ---');
    try {
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
        
      if (error) {
        console.error('获取表列表失败:', error);
      } else {
        console.log('Public schema中的表:', tables.map(table => table.table_name).join(', '));
      }
    } catch (err) {
      console.error('列出表时发生异常:', err);
    }
    
    console.log('\n--- 测试3: 检查users表结构 ---');
    try {
      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', 'users');
        
      if (error) {
        console.error('获取表结构失败:', error);
      } else {
        if (columns.length === 0) {
          console.log('未找到users表的列 - 表可能不存在或没有权限');
        } else {
          console.log('Users表结构:', columns);
        }
      }
    } catch (err) {
      console.error('获取表结构时发生异常:', err);
    }

    console.log('\n--- 测试4: 获取所有用户 ---');
    const { data: users, error, status, statusText } = await supabase
      .from('users')
      .select('*')
      .limit(100);

    console.log('查询状态:', status, statusText);
    if (error) {
      console.error('获取用户失败:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log('获取到的用户数量:', users ? users.length : 0);
      console.log('用户详情:', JSON.stringify(users, null, 2));
    }

    console.log('\n--- 测试5: 尝试获取特定用户 ---');
    const specificUserId = 'df9f7836-81f6-47c2-a30e-61f4b5e0ff49';
    const { data: specificUser, error: specificError, status: specificStatus } = await supabase
      .from('users')
      .select('*')
      .eq('id', specificUserId)
      .single();

    console.log('特定用户查询状态:', specificStatus);
    if (specificError) {
      console.error('获取特定用户失败:', {
        message: specificError.message,
        code: specificError.code,
        details: specificError.details,
        hint: specificError.hint
      });
    } else {
      console.log('特定用户详情:', JSON.stringify(specificUser, null, 2));
    }

    console.log('\n--- 测试6: 尝试获取auth.users表 ---');
    try {
      const { data: authUsers, error } = await supabase
        .from('auth.users')
        .select('id, email, created_at')
        .limit(10);
        
      if (error) {
        console.error('获取auth.users失败:', error);
      } else {
        console.log('auth.users数量:', authUsers ? authUsers.length : 0);
        console.log('auth.users详情:', JSON.stringify(authUsers, null, 2));
      }
    } catch (err) {
      console.error('获取auth.users时发生异常:', err);
    }

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    process.exit(0);
  }
}

testUsersAccess();