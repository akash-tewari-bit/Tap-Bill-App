import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Linking,
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
  getPairedDevices,
} from '../services/printService';

export default function PrinterSetup() {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [savedPrinter, setSavedPrinter] = useState<SavedPrinter | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualMac, setManualMac] = useState('');
  const [manualName, setManualName] = useState('');

  useEffect(() => {
    loadSavedPrinter();
  }, []);

  const loadSavedPrinter = async () => {
    const printer = await getSavedPrinter();
    setSavedPrinter(printer);
  };

  const handleScan = async () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'iOS Limitation',
        'Most thermal printers use Classic Bluetooth which iOS does not support for third-party apps.\n\nAlternatives:\n• Use a WiFi/Network printer\n• Use AirPrint (PDF printing)\n• Use an MFi-certified or BLE printer',
        [
          { text: 'Open Bluetooth Settings', onPress: () => Linking.openURL('App-Prefs:Bluetooth') },
          { text: 'OK', style: 'cancel' }
        ]
      );
      return;
    }

    setScanning(true);
    setDevices([]);
    
    // First try to get already paired devices
    const pairedDevices = await getPairedDevices();
    
    if (pairedDevices.length > 0) {
      setDevices(pairedDevices);
      setScanning(false);
    } else {
      // If no paired devices, try scanning
      const foundDevices = await scanBluetoothDevices();
      setDevices(foundDevices);
      setScanning(false);
      
      if (foundDevices.length === 0) {
        Alert.alert(
          'No Devices Found',
          'Make sure your printer is:\n\n1. Turned ON\n2. Paired in Android Bluetooth settings\n3. Within range\n\nWould you like to open Bluetooth settings?',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Enter Manually', onPress: () => setShowManualEntry(true) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    }
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
      Alert.alert(
        'Connection Failed',
        `Could not connect to ${device.deviceName}.\n\nMake sure the printer is turned on and nearby.`,
        [{ text: 'OK' }]
      );
    }
    
    setConnecting(null);
  };

  const handleManualConnect = async () => {
    if (!manualMac || manualMac.length < 17) {
      Alert.alert('Invalid MAC Address', 'Please enter a valid MAC address (e.g., 00:11:22:33:44:55)');
      return;
    }

    const device: PrinterDevice = {
      deviceName: manualName || 'Manual Printer',
      macAddress: manualMac.toUpperCase(),
    };

    await handleConnect(device);
    setShowManualEntry(false);
    setManualMac('');
    setManualName('');
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

      {/* iOS Warning */}
      {Platform.OS === 'ios' && (
        <View style={styles.iosWarning}>
          <Ionicons name="warning" size={20} color="#FF9500" />
          <Text style={styles.iosWarningText}>
            iOS has limited Bluetooth printer support. Consider using AirPrint or a WiFi printer.
          </Text>
        </View>
      )}

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
            <Text style={styles.scanButtonText}>
              {Platform.OS === 'ios' ? 'Check Printer Options' : 'Find Paired Printers'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Manual Entry Toggle */}
      {Platform.OS === 'android' && (
        <TouchableOpacity
          style={styles.manualEntryToggle}
          onPress={() => setShowManualEntry(!showManualEntry)}
        >
          <Ionicons name="create-outline" size={18} color="#007AFF" />
          <Text style={styles.manualEntryToggleText}>Enter MAC Address Manually</Text>
        </TouchableOpacity>
      )}

      {/* Manual Entry Form */}
      {showManualEntry && (
        <View style={styles.manualEntryForm}>
          <TextInput
            style={styles.manualInput}
            placeholder="Printer Name (optional)"
            value={manualName}
            onChangeText={setManualName}
          />
          <TextInput
            style={styles.manualInput}
            placeholder="MAC Address (e.g., 00:11:22:33:44:55)"
            value={manualMac}
            onChangeText={setManualMac}
            autoCapitalize="characters"
            maxLength={17}
          />
          <TouchableOpacity
            style={styles.manualConnectButton}
            onPress={handleManualConnect}
          >
            <Text style={styles.manualConnectButtonText}>Connect</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Device List */}
      {devices.length > 0 && (
        <View style={styles.deviceList}>
          <Text style={styles.deviceListTitle}>Paired Devices</Text>
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
          {Platform.OS === 'ios' 
            ? 'For iOS, use AirPrint-compatible printers or WiFi thermal printers for best results.'
            : 'First pair your thermal printer in Android Bluetooth settings, then tap "Find Paired Printers" above.'}
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
  iosWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  iosWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
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
  manualEntryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  manualEntryToggleText: {
    fontSize: 14,
    color: '#007AFF',
  },
  manualEntryForm: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  manualInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  manualConnectButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualConnectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
