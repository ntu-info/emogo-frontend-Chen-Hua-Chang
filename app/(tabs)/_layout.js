// app/(tabs)/_layout.js
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
// 【修改引入路徑】引入剛剛建立的按鈕
import ThemeToggle from '../../backgroundmode/switchbutton'; 
import { useTheme } from '../../backgroundmode/theme';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        // --- 外觀設定 ---
        tabBarStyle: { backgroundColor: colors.tabBar },
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        
        // --- Header (標題列) 設定 ---
        headerShown: true, // 【關鍵】開啟標題列，這會自動解決頁面太擠的問題
        headerStyle: { backgroundColor: colors.background }, // 標題列背景跟隨主題
        headerTintColor: colors.text, // 標題文字跟隨主題
        headerTitleAlign: 'center', // 標題置中
        
        // --- 右上角按鈕 (所有 Tab 頁面都會有) ---
        headerRight: () => <ThemeToggle />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="time"
        options={{
          title: '每日提醒設定',
          tabBarIcon: ({ color }) => <Ionicons name="time-outline" size={24} color={color} />,
        }}
      />
      
      {/* Records 雖然在這裡，但我們通常隱藏它，或讓它不顯示 Tab */}
      <Tabs.Screen name="records" options={{ href: null }} />
    </Tabs>
  );
}