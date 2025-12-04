import React from 'react';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from '../backgroundmode/theme';
// 1. 檢查這裡：有沒有引入？
import { UploadProvider } from '../context/UploadContext'; 

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      {/* 2. 檢查這裡：有沒有包住 Stack？缺了這個就會白屏 */}
      <UploadProvider>
        <ThemedStatusBar />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="scale" options={{ title: "開始填寫你的情緒" }} />
          
          <Stack.Screen
            name="vlog" 
            options={{
              title: "Vlog 錄影", 
              headerShown: true,
              headerStyle: { backgroundColor: 'black' },
              headerTintColor: 'white',
            }}
          />
          
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </UploadProvider>
    </ThemeProvider>
  );
}