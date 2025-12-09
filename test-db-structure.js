// 详细检查数据库结构的测试脚本
const { createClient } = require('@supabase/supabase-js');

// 使用环境变量或直接配置Supabase连接
const supabaseUrl = 'https://asukqilekjsuehcalduo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdWtxaWxla2pzdWVoY2FsZHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjQ1MzUsImV4cCI6MjA3OTY0MDUzNX0.SoUC709A2iSrwKiGtKPnbjO5XuVE2-0O1LWDTfHW5tk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStructure() {
  console.log('=== 开始检查数据库结构 ===');
  
  try {
    // 1. 检查连接状态
    console.log('\n1. 检查Supabase连接...');
    const { data: connectionCheck, error: connectionError } = await supabase.from('notes').select('id').limit(1);
    console.log('连接状态:', connectionError ? '失败' : '成功');
    if (connectionError) console.error('连接错误:', connectionError.message);
    
    // 2. 检查可用的表
    console.log('\n2. 检查可用的表...');
    const { data: tables, error: tablesError } = await supabase.rpc('list_tables');
    
    if (tablesError) {
      console.error('获取表列表失败:', tablesError.message);
      
      // 尝试使用另一种方式获取表
      console.log('\n尝试使用information_schema获取表...');
      const { data: infoTables, error: infoError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
        
      if (infoTables) {
        console.log('公共架构中的表:', infoTables.map(t => t.table_name));
      } else {
        console.error('获取表列表失败:', infoError.message);
      }
    } else {
      console.log('可用的表:', tables);
    }
    
    // 3. 检查users表结构
    console.log('\n3. 检查users表结构...');
    const { data: usersColumns, error: usersColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'users')
      .eq('table_schema', 'public');
      
    if (usersColumns) {
      console.log('users表列:', usersColumns);
      
      // 检查users表中的数据
      const { data: usersData, error: usersDataError } = await supabase
        .from('users')
        .select('*');
        
      if (usersData) {
        console.log('users表数据量:', usersData.length);
        if (usersData.length > 0) {
          console.log('users表前3条数据:', usersData.slice(0, 3));
        }
      } else {
        console.error('获取users表数据失败:', usersDataError.message);
      }
    } else {
      console.error('获取users表结构失败:', usersColumnsError.message);
    }
    
    // 4. 检查profiles表结构
    console.log('\n4. 检查profiles表结构...');
    const { data: profilesColumns, error: profilesColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');
      
    if (profilesColumns) {
      console.log('profiles表列:', profilesColumns);
      
      // 检查profiles表中的数据
      const { data: profilesData, error: profilesDataError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profilesData) {
        console.log('profiles表数据量:', profilesData.length);
        if (profilesData.length > 0) {
          console.log('profiles表前3条数据:', profilesData.slice(0, 3));
        }
      } else {
        console.error('获取profiles表数据失败:', profilesDataError.message);
      }
    } else {
      console.error('获取profiles表结构失败:', profilesColumnsError.message);
    }
    
    // 5. 检查是否有其他可能存储用户数据的表
    console.log('\n5. 检查可能存储用户数据的其他表...');
    const possibleUserTables = ['user', 'accounts', 'members', 'contacts'];
    
    for (const table of possibleUserTables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (tableData) {
          console.log(`表 ${table} 存在，数据量: ${tableData.length}`);
        }
      } catch (e) {
        // 忽略不存在的表
      }
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
  
  console.log('\n=== 数据库结构检查完成 ===');
}

// 运行检查
checkDatabaseStructure();