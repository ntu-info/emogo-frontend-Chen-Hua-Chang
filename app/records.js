import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { fetchAllRecords, clearAllData } from '../savedata/recordLoader';
import { shareVlogVideo } from '../savedata/vlogdata';

// 1. 引入匯出邏輯
import { exportDataAsJSON } from '../savedata/dataExporter';

const MOOD_EMOJIS = { 1: '😡', 2: '😞', 3: '😐', 4: '😊', 5: '😍' };

export default function RecordsScreen() {
  const router = useRouter();
  const [records, setRecords] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await fetchAllRecords();
    setRecords(data);
  };

  const handleClear = () => {
    Alert.alert("確定清空？", "這將刪除所有紀錄且無法復原。", [
      { text: "取消", style: "cancel" },
      { 
        text: "刪除", 
        style: "destructive", 
        onPress: async () => {
          await clearAllData();
          loadData(); 
        } 
      }
    ]);
  };

  const renderItem = ({ item }) => {
    const dateObj = new Date(item.timestamp);
    const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

    return (
      <View style={styles.card}>
        <View style={styles.moodSection}>
          <Text style={styles.emoji}>{MOOD_EMOJIS[item.mood_score] || '❓'}</Text>
          <Text style={styles.slotText}>{item.active_slot || 'N/A'}</Text>
        </View>
        <View style={styles.infoSection}>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.gpsText}>
            📍 {item.latitude ? `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}` : '無 GPS'}
          </Text>
          <Text style={styles.idText}>ID: {item.id}</Text>
        </View>
        <View style={styles.actionSection}>
          {item.file_uri ? (
            <TouchableOpacity 
              style={styles.videoButton} 
              onPress={() => shareVlogVideo(item.file_uri)}
            >
              <Ionicons name="play-circle" size={32} color="#007AFF" />
              <Text style={styles.btnText}>查看</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noVideo}>無影片</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        
        <Text style={styles.title}>後台資料檢查</Text>
        
        <View style={{ flexDirection: 'row' }}>
          {/* -------- 2. 這裡就是匯出按鈕 -------- */}
          <TouchableOpacity onPress={exportDataAsJSON} style={{ marginRight: 15 }}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          {/* ------------------------------------ */}

          <TouchableOpacity onPress={handleClear}>
            <Ionicons name="trash-outline" size={24} color="red" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.subtitle}>
        (右上角按鈕可匯出 JSON 交作業)
      </Text>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>目前沒有任何紀錄</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 10 },
  listContent: { paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', marginTop: 50, color: 'gray' },
  card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  moodSection: { alignItems: 'center', marginRight: 16, minWidth: 40 },
  emoji: { fontSize: 30 },
  slotText: { fontSize: 12, color: 'gray', marginTop: 4, textTransform: 'uppercase' },
  infoSection: { flex: 1 },
  dateText: { fontSize: 16, fontWeight: '600', color: '#333' },
  gpsText: { fontSize: 12, color: '#666', marginTop: 4 },
  idText: { fontSize: 10, color: '#aaa', marginTop: 2 },
  actionSection: { alignItems: 'center', justifyContent: 'center', minWidth: 50 },
  videoButton: { alignItems: 'center' },
  btnText: { fontSize: 10, color: '#007AFF' },
  noVideo: { fontSize: 10, color: '#ccc' }
});