import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Button, Alert, ActivityIndicator 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { fetchCurrentLocation } from '../savedata/gps.js'; // 只需要抓位置工具
import { useTheme } from '../backgroundmode/theme';

const screenWidth = Dimensions.get('window').width;
const buttonSize = screenWidth / 6; 
const emojiSize = buttonSize * 0.7; 
const MOODS = [
  { score: 1, emoji: '😡' }, { score: 2, emoji: '😞' }, { score: 3, emoji: '😐' },
  { score: 4, emoji: '😊' }, { score: 5, emoji: '😍' },
];

export default function ScaleScreen() {
  const [selectedMood, setSelectedMood] = useState(null); 
  // 增加一個取得位置中的狀態
  const [isLocating, setIsLocating] = useState(false);

  const router = useRouter(); 
  const { activeSlot } = useLocalSearchParams();
  const { colors } = useTheme();

  const handleMoodPress = (score) => {
    setSelectedMood(score); 
  };

  const handleStartVlog = async () => {
    if (selectedMood === null) {
      Alert.alert( "尚未填寫", "請先選擇一個代表您現在心情的表情" );
      return;
    }

    setIsLocating(true);

    // 1. 這裡只負責「取得目前經緯度」，不負責上傳
    // 抓 GPS 通常很快 (1-2秒)，這是唯一需要稍微等一下的地方
    const location = await fetchCurrentLocation();
    
    setIsLocating(false);

    if (location) {
      // 2. 拿到資料後，直接帶著這些資料跳轉到 Vlog 頁面
      // 我們不存資料庫，把責任往後傳
      router.push({
        pathname: '/vlog', 
        params: { 
          mood: selectedMood,
          activeSlot: activeSlot,
          // 把座標傳下去
          lat: location.latitude,
          lng: location.longitude
        } 
      });
    } else {
      Alert.alert("錯誤", "無法取得位置資訊，請檢查 GPS 設定。");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>你現在的心情如何？</Text>

      <View style={styles.moodContainer}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.score}
            style={[
              styles.moodButton, 
              { width: buttonSize, height: buttonSize },
              { backgroundColor: selectedMood === mood.score ? '#007AFF' : colors.card },
              selectedMood === mood.score && styles.selectedMoodButton
            ]}
            onPress={() => handleMoodPress(mood.score)}
            disabled={isLocating}
          >
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>{mood.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.vlogButtonContainer}>
        {isLocating ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button
            title="下一步：錄製 Vlog"
            onPress={handleStartVlog}
            color={colors.primary}
          />
        )}
      </View>
      
      {isLocating && (
        <Text style={{ marginTop: 10, color: colors.placeholder }}>正在定位中...</Text>
      )}

      <Text style={[styles.link, { color: colors.placeholder }]}>
        (時段: {activeSlot || 'N/A'})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40 },
  moodContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%' },
  moodButton: { alignItems: 'center', justifyContent: 'center', borderRadius: buttonSize / 2 },
  selectedMoodButton: { transform: [{ scale: 1.1 }] },
  emoji: {},
  vlogButtonContainer: { marginTop: 60, width: '80%', height: 50, justifyContent: 'center' },
  link: { marginTop: 20, fontSize: 14 },
});