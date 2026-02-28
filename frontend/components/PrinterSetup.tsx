import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  scanBluetoothDevices,
  connectToPrinter,
  savePrinter,
  getSavedPrinter,
  removeSavedPrinter,
  testPrint,
  PrinterDevice,
  SavedPrinter,
} from '../services/printService';

export default function PrinterSetup() {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [savedPrinter, setSavedPrinter] = useState<SavedPrinter | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadSavedPrinter();
  }, []);

  const loadSavedPrinter = async () => {
    const printer = await getSavedPrinter();
    setSavedPrinter(printer);
  };

  const handleScan = async () => {
    setScanning(true);
    setDevices([]);
    
    const foundDevices = await scanBluetoothDevices();
    setDevices(foundDevices);
    setScanning(false);
  };

  const handleConnect = async (device: PrinterDevice) => {
    setConnecting(device.macAddress);
    
    const success = await connectToPrinter(device.macAddress);
    
    if (success) {
      await savePrinter({
        deviceName: device.deviceName,
        macAddress: device.macAddress,
      });
      setSavedPrinter({
        deviceName: device.deviceName,
        macAddress: device.macAddress,
      });
      Alert.alert('Success', `Connected to ${device.deviceName}`);
    } else {
      Alert.alert('Failed', `Could not connect to ${device.deviceName}`);
    }
    
    setConnecting(null);
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Remove Printer',
      'Are you sure you want to remove the saved printer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeSavedPrinter();
            setSavedPrinter(null);
          },
        },
      ]
    );
  };

  const handleTestPrint = async () => {
    setTesting(true);
    await testPrint();
    setTesting(false);
  };

  const renderDevice = ({ item }: { item: PrinterDevice }) => {
    const isConnecting = connecting === item.macAddress;
    const isSaved = savedPrinter?.macAddress === item.macAddress;

    return (
      <TouchableOpacity
        style={[styles.deviceItem, isSaved && styles.deviceItemSaved]}
        onPress={() => handleConnect(item)}
        disabled={isConnecting}
      >
        <View style={styles.deviceInfo}>
          <Ionicons
            name={isSaved ? 'print' : 'print-outline'}
            size={24}
            color={isSaved ? '#34C759' : '#8E8E93'}
          />
          <View style={styles.deviceText}>
            <Text style={styles.deviceName}>{item.deviceName}</Text>
            <Text style={styles.deviceAddress}>{item.macAddress}</Text>
          </View>
        </View>
        {isConnecting ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : isSaved ? (
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Bluetooth Printer</Text>

      {/* Current Printer */}
      {savedPrinter && (
        <View style={styles.currentPrinter}>
          <View style={styles.currentPrinterInfo}>
            <Ionicons name="print" size={32} color="#34C759" />
            <View style={styles.currentPrinterText}>
              <Text style={styles.currentPrinterName}>{savedPrinter.deviceName}</Text>
              <Text style={styles.currentPrinterAddress}>{savedPrinter.macAddress}</Text>
            </View>
          </View>
          <View style={styles.currentPrinterActions}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestPrint}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={18} color="#007AFF" />
                  <Text style={styles.testButtonText}>Test Print</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleDisconnect}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Scan Button */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={handleScan}
        disabled={scanning}
      >
        {scanning ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Scanning...</Text>
          </>
        ) : (
          <>
            <Ionicons name="bluetooth" size={20} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Scan for Printers</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Device List */}
      {devices.length > 0 && (
        <View style={styles.deviceList}>
          <Text style={styles.deviceListTitle}>Available Devices</Text>
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={(item) => item.macAddress}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
        <Text style={styles.helpText}>
          Make sure your thermal printer is paired in your device's Bluetooth settings first.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  currentPrinter: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  currentPrinterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPrinterText: {
    marginLeft: 12,
    flex: 1,
  },
  currentPrinterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  currentPrinterAddress: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  currentPrinterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  removeButton: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deviceList: {
    marginTop: 16,
  },
  deviceListTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  deviceItemSaved: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceText: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  connectedBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
});
