'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';

interface SearchUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export function useUserSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) {
          throw new Error('搜索失败');
        }

        const data = await response.json();
        setSearchResults(data.users || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '搜索失败');
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const searchUsers = (query: string) => {
    setSearchQuery(query);
  };

  return {
    searchQuery,
    searchResults,
    loading,
    error,
    searchUsers,
  };
}
