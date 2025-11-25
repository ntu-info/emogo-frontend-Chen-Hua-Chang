// backgroundmode/switchbutton.js
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// 因為在同一個資料夾，直接引入 theme 即可
import { useTheme } from './theme'; 

export default function ThemeToggle() {
  const { toggleTheme, isDark, colors } = useTheme();

  return (
    <TouchableOpacity onPress={toggleTheme} style={styles.button}>
      {/* 根據模式顯示 月亮(深色) 或 太陽(淺色) */}
      <Ionicons 
        name={isDark ? "moon" : "sunny"} 
        size={24} 
        color={colors.text} // 圖示顏色隨主題變換
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 15, // 讓按鈕與螢幕邊緣保持距離
    padding: 5,
  },
});