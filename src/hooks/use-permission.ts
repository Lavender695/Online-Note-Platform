'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';
import { PermissionType } from '@/types/permissions';

// 模拟数据 - 当Supabase连接失败时使用
const MOCK_PERMISSION: PermissionType = 'editor';
import { Note } from '@/types/note';

export function usePermission(note: Note | undefined) {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PermissionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !note) {
      setPermission(null);
      setLoading(false);
      return;
    }

    // 检查用户权限
    const checkPermission = async () => {
      try {
        setLoading(true);
        
        // 如果用户是笔记所有者，拥有所有权限
        if (user.id === note.user_id) {
          setPermission('editor');
          setLoading(false);
          return;
        }

        // 否则检查权限表
        const { data, error } = await supabase
          .from('note_permissions')
          .select('permission')
          .eq('note_id', note.id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // 没有找到权限记录
            setPermission(null);
          } else {
            throw error;
          }
        } else {
          setPermission(data.permission as PermissionType);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error getting note permissions:', err);
        // 使用模拟数据作为回退
        console.log('Using mock permission as fallback');
        setPermission(MOCK_PERMISSION);
        setError('Failed to check permission: Using mock data (see console for details)');
        setLoading(false);
      }
    };

    checkPermission();

    // 订阅权限变化
    const channel = supabase
      .channel(`permission-channel-${note.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_permissions',
          filter: `note_id=eq.${note.id} AND user_id=eq.${user.id}`
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              setPermission(payload.new.permission as PermissionType);
              break;
            case 'UPDATE':
              setPermission(payload.new.permission as PermissionType);
              break;
            case 'DELETE':
              setPermission(null);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, note]);

  // 权限检查辅助函数
  const canView = () => {
    if (!user || !note) return false;
    if (user.id === note.user_id) return true;
    return permission !== null;
  };

  const canEdit = () => {
    if (!user || !note) return false;
    if (user.id === note.user_id) return true;
    return permission === 'editor';
  };

  const canComment = () => {
    if (!user || !note) return false;
    if (user.id === note.user_id) return true;
    return permission === 'editor' || permission === 'commenter';
  };

  const isOwner = () => {
    if (!user || !note) return false;
    return user.id === note.user_id;
  };

  return {
    permission,
    loading,
    error,
    canView,
    canEdit,
    canComment,
    isOwner,
  };
}
