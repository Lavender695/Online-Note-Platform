import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  console.log('🔍 收到用户搜索请求');
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    console.log('🔍 搜索查询参数:', query);

    // 定义用户数据数组
    let users: Array<{id: string, email: string, full_name?: string, avatar_url?: string}> = [];

    // 1. 尝试从profiles表获取用户数据（如果存在）
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url');

    if (profilesData && profilesData.length > 0) {
      users = profilesData;
      console.log('✅ 从profiles表获取到用户数据');
    } else {
      console.log('ℹ️ profiles表为空或不存在');
    }

    // 2. 如果profiles表没有数据，尝试从users表获取
    if (users.length === 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email');

      if (usersData && usersData.length > 0) {
        users = usersData;
        console.log('✅ 从users表获取到用户数据');
      } else {
        console.log('ℹ️ users表为空或不存在');
      }
    }

    console.log('✅ 获取到的所有用户:', users);

    // 如果没有查询参数，直接返回所有用户
    if (!query) {
      console.log('ℹ️ 没有搜索查询参数，返回所有用户');
      return NextResponse.json({ users });
    }

    // 过滤用户
    const searchTerm = query.toLowerCase();
    const filteredUsers = users.filter(user => 
      (user.email?.toLowerCase().includes(searchTerm)) ||
      (user.full_name?.toLowerCase().includes(searchTerm)) ||
      (user.id?.toLowerCase().includes(searchTerm))
    );

    console.log('✅ 过滤后的用户结果:', filteredUsers);

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error('❌ 搜索用户时发生服务器错误:', error);
    return NextResponse.json({ error: '搜索用户时发生服务器错误' }, { status: 500 });
  }
}
