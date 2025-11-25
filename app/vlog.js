import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Button } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons'; 
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'; 

import { initVlogDB, saveVlogVideo } from '../savedata/vlogdata'; 
import { markRecordingAsCompleted } from '../savedata/settingsStorage';

const MIN_RECORD_TIME = 5;
const MAX_RECORD_TIME = 20;

export default function VlogScreen() {
  const router = useRouter();
  const { mood, activeSlot, scaleId } = useLocalSearchParams(); 

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const cameraRef = useRef(null);
  
  // 使用 Ref 來追蹤時間，避免在 async function 中讀取到舊的 state
  const durationRef = useRef(0); 

  const [facing, setFacing] = useState('front'); 
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [canStop, setCanStop] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false);

  const intervalRef = useRef(null);

  useEffect(() => {
    initVlogDB();
  }, []);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // 這裡主要是給「手動停止按鈕」用的
  const stopRecording = async () => {
    if (!isRecording || isProcessing) return; 
    
    setIsProcessing(true); 
    console.log("使用者手動停止錄影...");

    try {
      // 呼叫這個方法會讓下方的 recordAsync Promise 結束並回傳
      if (cameraRef.current) {
        cameraRef.current.stopRecording();
      }
      // 清理工作會由 startRecording 裡的 await 後續流程統一處理
      
    } catch (error) {
      console.error("停止錄影失敗:", error);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    
    console.log("開始錄製... 對應 ScaleID:", scaleId);
    setIsRecording(true);
    setElapsedTime(0);
    durationRef.current = 0; // 重置計時 Ref
    setCanStop(false);
    setIsProcessing(false);

    // 啟動計時器 (僅供 UI 顯示)
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsedTime((prevTime) => {
        const newTime = prevTime + 1;
        durationRef.current = newTime; // 同步更新 Ref
        
        if (newTime >= MIN_RECORD_TIME) setCanStop(true);
        
        // 修改重點：移除這裡的自動停止邏輯
        // 讓 camera 的 maxDuration 自己負責停，才不會因為時間差導致檔案少 1 秒
        
        return newTime; 
      });
    }, 1000);

    try {
      // 開始錄影，並設定 maxDuration
      // 當時間到 (20秒) 或使用者手動呼叫 stopRecording 時，這個 Promise 會 resolve
      const videoData = await cameraRef.current.recordAsync({
        maxDuration: MAX_RECORD_TIME,
        quality: '720p', 
      });

      // --- 錄影結束後的清理工作 ---
      console.log("錄影結束，暫存路徑:", videoData.uri);
      
      // 停止計時器
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRecording(false);

      // 使用 Ref 的值作為最終秒數 (如果因為 maxDuration 停止，這時可能剛好是 20)
      // 若 maxDuration 觸發，durationRef 可能還在 19 或 20，我們取兩者較大或直接用 MAX
      const finalTime = durationRef.current < MAX_RECORD_TIME ? durationRef.current : MAX_RECORD_TIME;
      
      await handleSaveAndFinish(videoData.uri, finalTime);

    } catch (error) {
      console.error("錄影過程發生錯誤:", error);
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      if (error.message && error.message.includes('permissions')) {
        Alert.alert("權限不足", "請確認您已允許麥克風權限");
      }
    }
  };

  const handleSaveAndFinish = async (tempUri, finalDuration) => {
    try {
      await saveVlogVideo(tempUri, scaleId, finalDuration);
      await markRecordingAsCompleted(activeSlot);

      Alert.alert(
        "錄製完成",
        "資料已成功儲存，感謝您的紀錄！",
        [
          { 
            text: "回到首頁", 
            onPress: () => router.push('/(tabs)') 
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert("儲存失敗", "影片存檔時發生錯誤");
      console.error(error);
    }
  };

  if (!cameraPermission || !micPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white', textAlign: 'center', marginBottom: 20, fontSize: 16 }}>
          錄製 Vlog 需要同時開啟 {'\n'}「相機」與「麥克風」權限
        </Text>
        {!cameraPermission.granted && (
          <View style={{ marginVertical: 10 }}>
             <Button onPress={requestCameraPermission} title="授權相機" />
          </View>
        )}
        {!micPermission.granted && (
          <View style={{ marginVertical: 10 }}>
            <Button onPress={requestMicPermission} title="授權麥克風" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.cameraPreview} 
        facing={facing} 
        mode="video"   
        ref={cameraRef}
      >
        {isRecording && (
          <View style={styles.timerOverlay}>
            <Text style={styles.timerText}>
              {elapsedTime}s / {MAX_RECORD_TIME}s
            </Text>
          </View>
        )}

        {!isRecording && (
          <>
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionTitle}>錄影提醒：</Text>
              <Text style={styles.instructionText}>• 點擊紅鈕開始錄影 (5~20秒)</Text>
              <Text style={styles.instructionText}>• 鏡頭方向只能在錄影前切換</Text>
            </View>

            <TouchableOpacity 
              style={styles.flipButton} 
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={28} color="white" />
            </TouchableOpacity>
          </>
        )}
      </CameraView>

      <View style={styles.controlsContainer}>
        {!isRecording ? (
          <TouchableOpacity 
            style={styles.recordButtonOuter}
            onPress={startRecording}
            disabled={isProcessing}
          >
            <FontAwesome name="circle" size={40} color="red" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[ styles.stopButtonOuter, !canStop && styles.disabledButton ]} 
            onPress={stopRecording} 
            disabled={!canStop || isProcessing} 
          >
            <FontAwesome name="square" size={40} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  cameraPreview: { flex: 1 }, 
  
  timerOverlay: { 
    position: 'absolute', 
    top: 60, 
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.6)', 
    paddingVertical: 8,
    paddingHorizontal: 15, 
    borderRadius: 20 
  },
  timerText: { fontSize: 24, fontWeight: 'bold', color: 'white' },

  instructionContainer: {
    position: 'absolute',
    top: 60, 
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    padding: 12,
    borderRadius: 10,
    maxWidth: '75%', 
  },
  instructionTitle: {
    color: '#FFD700', 
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  instructionText: {
    color: 'white',
    fontSize: 13,
    marginBottom: 2,
    lineHeight: 18,
  },

  flipButton: {
    position: 'absolute',
    top: 60,    
    right: 20,  
    width: 50,
    height: 50,
    borderRadius: 25, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)' 
  },
  controlsContainer: { 
    height: 150, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'black' 
  },
  recordButtonOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: 'white', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  stopButtonOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: 'white', backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' },
  disabledButton: { opacity: 0.3 },
});