'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // 从localStorage获取保存的主题
    const savedTheme = localStorage.getItem('theme') as Theme;
    // 如果没有保存的主题，使用系统主题偏好
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || preferredTheme;
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    // 移除所有自定义主题类
    document.documentElement.classList.remove('blue', 'green', 'purple');
    
    // 根据主题设置类
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      
      // 对于自定义主题，添加主题类
      if (newTheme !== 'light') {
        document.documentElement.classList.add(newTheme);
      }
    }
  };

  const setThemeMode = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'blue', 'green', 'purple'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setThemeMode(themes[nextIndex]);
  };

  // 监听系统主题变化
  useEffect(() => {
    if (!isMounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (!savedTheme) {
        // 如果用户没有手动设置主题，跟随系统变化
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        setTheme(systemTheme);
        applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isMounted]);

  return { theme, setTheme: setThemeMode, toggleTheme };
}