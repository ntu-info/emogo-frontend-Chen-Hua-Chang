import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs>
      {/* Tab 1: 首頁 (app/(tabs)/index.js) */}
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          headerShown: false, // 讓首頁內容自己控制標題
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      
      {/* Tab 2: 設定時間 (app/(tabs)/time.js) */}
      <Tabs.Screen
        name="time"
        options={{
          title: '時間設定',
          headerShown: false, // 讓時間設定頁面自己控制標題
          tabBarIcon: ({ color }) => (
            <Ionicons name="time-outline" size={24} color={color} />
          ),
        }}
      />
      
      {/* 隱藏其他頁面 (例如 records 是給按鈕跳轉的，不應該有 Tab) */}
      <Tabs.Screen name="records" options={{ href: null }} />
    </Tabs>
  );
}