import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 定義淺色與深色模式的色票
export const Colors = {
  light: {
    background: '#ffffff',
    text: '#000000',
    card: '#f0f0f0',       // 卡片或區塊背景
    primary: '#007AFF',    // 主色 (藍色)
    tabBar: '#ffffff',     // 下方導覽列背景
    tabIconDefault: '#8e8e93',
    tabIconSelected: '#007AFF',
    border: '#dddddd',
    inputBackground: '#ffffff', // Android 下拉選單背景 (白)
    inputText: '#000000',       // Android 下拉選單文字 (黑)
    placeholder: '#999999',
  },
  dark: {
    background: '#121212', // 深色背景
    text: '#ffffff',       // 深色模式文字變白
    card: '#1e1e1e',       // 深色區塊
    primary: '#0A84FF',    // 深色模式下的主色 (通常會亮一點)
    tabBar: '#121212',     // 下方導覽列變黑
    tabIconDefault: '#8e8e93',
    tabIconSelected: '#0A84FF',
    border: '#333333',
    inputBackground: '#2c2c2c', // Android 下拉選單背景 (深灰)
    inputText: '#ffffff',       // Android 下拉選單文字 (白)
    placeholder: '#666666',
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState(systemScheme || 'light');

  // 讀取上次設定
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch (e) {
        console.log('Failed to load theme settings');
      }
    };
    loadTheme();
  }, []);

  // 切換模式功能
  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('userTheme', newTheme);
  };

  const value = {
    theme,
    toggleTheme,
    colors: Colors[theme],
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);