import React from 'react';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
// 移除 databasecheck 的引入
import { ThemeProvider, useTheme } from '../backgroundmode/theme';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  
  // 移除 useEffect 和 initializeAllDatabases
    
  return (
    <ThemeProvider>
      <ThemedStatusBar />
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        
        <Stack.Screen
          name="scale"
          options={{ title: "開始填寫你的情緒" }}
        />
        
        <Stack.Screen
          name="vlog" 
          options={{
            title: "Vlog 錄影", 
            headerShown: true,
            headerStyle: { backgroundColor: 'black' },
            headerTintColor: 'white',
          }}
        />
        
        {/* 移除 records 頁面的註冊，因為我們不再需要在 App 內看資料了 */}
        
        <Stack.Screen
            name="index"
            options={{ headerShown: false }}
        />

      </Stack>
    </ThemeProvider>
  );
}