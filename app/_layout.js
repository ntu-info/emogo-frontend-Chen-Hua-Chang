import React, { useEffect } from 'react';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
// 1. 引入資料庫檢查工具
import { initializeAllDatabases } from '../savedata/databasecheck';

export default function RootLayout() {
  
  // 2. 在 App 啟動時，確保所有資料表都已建立
  useEffect(() => {
    console.log("[Layout] App 啟動，檢查資料庫完整性...");
    initializeAllDatabases();
  }, []);
    
  return (
    <>
      <StatusBar style="auto" />
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
            // 修正拼字：headerShow -> headerShown
            headerShown: true, 
          }}
        />
        
        <Stack.Screen
          name="records" 
          options={{
            title: "後台資料", 
            headerShown: false, 
          }}
        />

      </Stack>
    </>
  );
}