import React, { useEffect } from 'react';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
// 引入資料庫檢查工具
import { initializeAllDatabases } from '../savedata/databasecheck';
// 引入主題供應器 (ThemeProvider)
import { ThemeProvider, useTheme } from '../backgroundmode/theme';

// 建立一個內部組件來控制 StatusBar，因為 useTheme 必須在 ThemeProvider 內部才能用
function ThemedStatusBar() {
  const { isDark } = useTheme();
  // 當深色模式時，狀態列文字變白(light)；淺色模式時，狀態列文字變黑(dark)
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  
  // 在 App 啟動時，確保所有資料表都已建立
  useEffect(() => {
    console.log("[Layout] App 啟動，檢查資料庫完整性...");
    initializeAllDatabases();
  }, []);
    
  return (
    // 用 ThemeProvider 包裹整個 App
    <ThemeProvider>
      <ThemedStatusBar />
      <Stack>
        {/* 底部 Tab Bar 群組 */}
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        
        {/* 其他頁面 */}
        <Stack.Screen
          name="scale"
          options={{ title: "開始填寫你的情緒" }}
        />
        
        <Stack.Screen
          name="vlog" 
          options={{
            title: "Vlog 錄影", 
            headerShown: true,
            // 錄影頁面通常強制深色 Header，這裡保持預設或微調即可
            headerStyle: { backgroundColor: 'black' },
            headerTintColor: 'white',
          }}
        />
        
        <Stack.Screen
          name="records" 
          options={{
            title: "後台資料", 
            headerShown: false, 
          }}
        />
        
        {/* 安全模式頁面 */}
        <Stack.Screen
            name="index"
            options={{ headerShown: false }}
        />

      </Stack>
    </ThemeProvider>
  );
}