// 测试用户搜索功能
const { createClient } = require('@supabase/supabase-js');

// 使用相同的Supabase配置
const supabaseUrl = 'https://asukqilekjsuehcalduo.supabase.co';
const supabaseKey = ''; // 请填写实际的Supabase Key

console.log('测试Supabase用户搜索功能...');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

// 创建Supabase客户端
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

// 测试查询用户
async function testUserSearch(query) {
  console.log(`\n测试搜索: ${query}`);
  
  try {
    // 先尝试获取所有用户
    console.log('尝试获取所有用户...');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);
      
    if (allUsersError) {
      console.error('获取所有用户失败:', allUsersError);
    } else {
      console.log('获取到的所有用户:', allUsers);
    }
    
    // 测试搜索查询
    console.log('尝试搜索查询...');
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email')
      .or(`id.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('搜索用户失败:', error);
    } else {
      console.log('搜索结果:', users);
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testUserSearch('test'); // 替换为实际的测试查询
