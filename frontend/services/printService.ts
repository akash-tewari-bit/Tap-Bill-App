import { Platform, Alert, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Order, Settings } from './storage';

// Storage key for saved printer
const PRINTER_STORAGE_KEY = '@saved_printer';

export interface PrinterDevice {
  deviceName: string;
  macAddress: string;
  id?: string;
  serviceUUIDs?: string[];
}

export interface PrintData {
  order: Order;
  settings: Settings;
}

export interface SavedPrinter {
  deviceName: string;
  macAddress: string;
  id?: string;
}

// BLE Manager instance
let bleManager: any = null;
let connectedDevice: any = null;

// Common thermal printer service and characteristic UUIDs
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Another common one
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Generic
];

const PRINTER_CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // Write characteristic
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // Another common one
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', // Generic write
];

// Get BLE Manager
const getBleManager = () => {
  if (bleManager) return bleManager;
  
  try {
    const { BleManager } = require('react-native-ble-plx');
    bleManager = new BleManager();
    return bleManager;
  } catch (error) {
    console.log('BLE Manager not available:', error);
    return null;
  }
};

// Request Bluetooth permissions
export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // iOS handles permissions automatically when scanning
    return true;
  }
  
  if (Platform.OS !== 'android') return true;
  
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    
    const allGranted = Object.values(granted).every(
      status => status === PermissionsAndroid.RESULTS.GRANTED
    );
    
    return allGranted;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};

// Check if Bluetooth is enabled
export const isBluetoothEnabled = async (): Promise<boolean> => {
  const manager = getBleManager();
  if (!manager) return false;
  
  return new Promise((resolve) => {
    manager.state().then((state: string) => {
      resolve(state === 'PoweredOn');
    }).catch(() => resolve(false));
  });
};

// Enable Bluetooth (Android only - iOS shows system dialog automatically)
export const enableBluetooth = async (): Promise<boolean> => {
  const manager = getBleManager();
  if (!manager) return false;
  
  if (Platform.OS === 'ios') {
    Alert.alert('Bluetooth Required', 'Please enable Bluetooth in your device settings.');
    return false;
  }
  
  try {
    await manager.enable();
    return true;
  } catch (error) {
    console.error('Enable Bluetooth error:', error);
    Alert.alert('Bluetooth Required', 'Please enable Bluetooth in your device settings.');
    return false;
  }
};

// Scan for BLE printers
export const scanBluetoothDevices = async (): Promise<PrinterDevice[]> => {
  const manager = getBleManager();
  
  if (!manager) {
    Alert.alert(
      'Development Build Required',
      'BLE printing requires a Development Build.\n\nRun:\nnpx expo run:android\nor\nnpx expo run:ios',
      [{ text: 'OK' }]
    );
    return [];
  }
  
  // Request permissions
  const hasPermission = await requestBluetoothPermissions();
  if (!hasPermission) {
    Alert.alert('Permission Denied', 'Bluetooth permissions are required to scan for printers.');
    return [];
  }
  
  // Check Bluetooth state
  const isEnabled = await isBluetoothEnabled();
  if (!isEnabled) {
    const enabled = await enableBluetooth();
    if (!enabled) return [];
  }
  
  return new Promise((resolve) => {
    const devices: PrinterDevice[] = [];
    const deviceIds = new Set<string>();
    
    // Stop any existing scan
    manager.stopDeviceScan();
    
    // Set timeout for scan (10 seconds)
    const timeout = setTimeout(() => {
      manager.stopDeviceScan();
      resolve(devices);
    }, 10000);
    
    // Start scanning
    manager.startDeviceScan(
      null, // Scan for all devices (no service UUID filter)
      { allowDuplicates: false },
      (error: any, device: any) => {
        if (error) {
          console.error('Scan error:', error);
          clearTimeout(timeout);
          manager.stopDeviceScan();
          resolve(devices);
          return;
        }
        
        if (device && device.name && !deviceIds.has(device.id)) {
          deviceIds.add(device.id);
          
          // Filter for likely printers (optional - can be removed for broader results)
          const name = device.name.toLowerCase();
          const isPrinter = name.includes('print') || 
                          name.includes('pos') || 
                          name.includes('thermal') ||
                          name.includes('bt') ||
                          name.includes('spp') ||
                          name.includes('receipt') ||
                          name.length > 0; // Include all named devices
          
          if (isPrinter) {
            devices.push({
              deviceName: device.name || 'Unknown Device',
              macAddress: device.id,
              id: device.id,
              serviceUUIDs: device.serviceUUIDs,
            });
          }
        }
      }
    );
  });
};

// Get already paired/known devices (alias for scan)
export const getPairedDevices = async (): Promise<PrinterDevice[]> => {
  return scanBluetoothDevices();
};

// Connect to a BLE printer
export const connectToPrinter = async (deviceId: string): Promise<boolean> => {
  const manager = getBleManager();
  if (!manager) return false;
  
  try {
    // Disconnect any existing connection
    if (connectedDevice) {
      try {
        await connectedDevice.cancelConnection();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    
    // Connect to device
    console.log('Connecting to device:', deviceId);
    const device = await manager.connectToDevice(deviceId, {
      timeout: 10000,
    });
    
    // Discover services and characteristics
    console.log('Discovering services...');
    await device.discoverAllServicesAndCharacteristics();
    
    connectedDevice = device;
    console.log('Connected successfully');
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
  }
};

// Find the write characteristic for the printer
const findWriteCharacteristic = async (device: any): Promise<{ serviceUUID: string; charUUID: string } | null> => {
  try {
    const services = await device.services();
    
    for (const service of services) {
      const characteristics = await service.characteristics();
      
      for (const char of characteristics) {
        // Check if this characteristic supports write
        if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
          console.log('Found writable characteristic:', char.uuid);
          return {
            serviceUUID: service.uuid,
            charUUID: char.uuid,
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding write characteristic:', error);
    return null;
  }
};

// Save printer to storage
export const savePrinter = async (printer: SavedPrinter): Promise<void> => {
  await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer));
};

// Get saved printer
export const getSavedPrinter = async (): Promise<SavedPrinter | null> => {
  try {
    const saved = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    return null;
  }
};

// Remove saved printer
export const removeSavedPrinter = async (): Promise<void> => {
  await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
  if (connectedDevice) {
    try {
      await connectedDevice.cancelConnection();
    } catch (e) {}
    connectedDevice = null;
  }
};

// Convert string to bytes for ESC/POS
const stringToBytes = (str: string): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
};

// ESC/POS commands
const ESC = 0x1B;
const GS = 0x1D;
const COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x20],
  DOUBLE_SIZE_ON: [GS, 0x21, 0x30],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  FEED_LINE: [0x0A],
  CUT_PAPER: [GS, 0x56, 0x00],
};

// Generate receipt data as ESC/POS commands
const generateReceiptData = (printData: PrintData): number[] => {
  const { order, settings } = printData;
  let data: number[] = [];
  
  // Initialize printer
  data = data.concat(COMMANDS.INIT);
  
  // Center align for header
  data = data.concat(COMMANDS.ALIGN_CENTER);
  
  // Business name (large, bold)
  if (settings.businessName) {
    data = data.concat(COMMANDS.DOUBLE_SIZE_ON);
    data = data.concat(COMMANDS.BOLD_ON);
    data = data.concat(stringToBytes(settings.businessName));
    data = data.concat(COMMANDS.FEED_LINE);
    data = data.concat(COMMANDS.BOLD_OFF);
    data = data.concat(COMMANDS.NORMAL_SIZE);
  }
  
  // Address
  if (settings.address) {
    data = data.concat(stringToBytes(settings.address));
    data = data.concat(COMMANDS.FEED_LINE);
  }
  
  // Phone
  if (settings.phone) {
    data = data.concat(stringToBytes(`Tel: ${settings.phone}`));
    data = data.concat(COMMANDS.FEED_LINE);
  }
  
  // GST
  if (settings.gstNumber) {
    data = data.concat(stringToBytes(`GST: ${settings.gstNumber}`));
    data = data.concat(COMMANDS.FEED_LINE);
  }
  
  // Separator
  data = data.concat(stringToBytes('--------------------------------'));
  data = data.concat(COMMANDS.FEED_LINE);
  
  // Order details (left align)
  data = data.concat(COMMANDS.ALIGN_LEFT);
  
  const orderDate = new Date(order.timestamp);
  const formattedDate = orderDate.toLocaleDateString('en-IN');
  const formattedTime = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  
  data = data.concat(COMMANDS.BOLD_ON);
  data = data.concat(stringToBytes(`Order #${order.id}`));
  data = data.concat(COMMANDS.FEED_LINE);
  data = data.concat(COMMANDS.BOLD_OFF);
  
  data = data.concat(stringToBytes(`Date: ${formattedDate}`));
  data = data.concat(COMMANDS.FEED_LINE);
  data = data.concat(stringToBytes(`Time: ${formattedTime}`));
  data = data.concat(COMMANDS.FEED_LINE);
  
  if (order.customerName) {
    data = data.concat(stringToBytes(`Customer: ${order.customerName}`));
    data = data.concat(COMMANDS.FEED_LINE);
  }
  
  // Separator
  data = data.concat(stringToBytes('--------------------------------'));
  data = data.concat(COMMANDS.FEED_LINE);
  
  // Items
  for (const item of order.items) {
    const itemTotal = item.quantity * item.menuItem.price;
    const itemLine = `${item.menuItem.name.substring(0, 16).padEnd(16)} x${item.quantity}  Rs.${itemTotal}`;
    data = data.concat(stringToBytes(itemLine));
    data = data.concat(COMMANDS.FEED_LINE);
  }
  
  // Separator and total
  data = data.concat(stringToBytes('--------------------------------'));
  data = data.concat(COMMANDS.FEED_LINE);
  
  data = data.concat(COMMANDS.BOLD_ON);
  data = data.concat(COMMANDS.DOUBLE_HEIGHT_ON);
  data = data.concat(stringToBytes(`TOTAL: Rs.${order.totalAmount}`));
  data = data.concat(COMMANDS.FEED_LINE);
  data = data.concat(COMMANDS.NORMAL_SIZE);
  data = data.concat(COMMANDS.BOLD_OFF);
  
  data = data.concat(stringToBytes('--------------------------------'));
  data = data.concat(COMMANDS.FEED_LINE);
  
  // Payment mode
  data = data.concat(stringToBytes(`Payment: ${order.paymentMode}`));
  data = data.concat(COMMANDS.FEED_LINE);
  
  // Footer
  data = data.concat(COMMANDS.FEED_LINE);
  data = data.concat(COMMANDS.ALIGN_CENTER);
  data = data.concat(stringToBytes('Thank you for your order!'));
  data = data.concat(COMMANDS.FEED_LINE);
  data = data.concat(stringToBytes('Please visit again'));
  data = data.concat(COMMANDS.FEED_LINE);
  data = data.concat(COMMANDS.FEED_LINE);
  data = data.concat(COMMANDS.FEED_LINE);
  data = data.concat(COMMANDS.FEED_LINE);
  
  return data;
};

// Write data to printer in chunks
const writeDataToPrinter = async (device: any, data: number[]): Promise<boolean> => {
  try {
    const writeInfo = await findWriteCharacteristic(device);
    if (!writeInfo) {
      console.error('No writable characteristic found');
      return false;
    }
    
    const { serviceUUID, charUUID } = writeInfo;
    const chunkSize = 20; // BLE typically has 20 byte MTU for write
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const base64Data = Buffer.from(chunk).toString('base64');
      
      await device.writeCharacteristicWithResponseForService(
        serviceUUID,
        charUUID,
        base64Data
      );
      
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return true;
  } catch (error) {
    console.error('Write error:', error);
    return false;
  }
};

// Print receipt
export const printReceipt = async (printData: PrintData): Promise<boolean> => {
  const manager = getBleManager();
  
  if (!manager) {
    Alert.alert(
      'Development Build Required',
      'BLE printing requires a Development Build.\n\nRun: npx expo run:android\nor: npx expo run:ios'
    );
    return false;
  }
  
  try {
    const savedPrinter = await getSavedPrinter();
    
    if (!savedPrinter) {
      Alert.alert('No Printer', 'Please configure a printer in Settings first.');
      return false;
    }
    
    // Connect if not connected
    if (!connectedDevice || !(await connectedDevice.isConnected())) {
      const connected = await connectToPrinter(savedPrinter.macAddress);
      if (!connected) {
        Alert.alert('Connection Failed', 'Could not connect to printer. Please check if it is turned on.');
        return false;
      }
    }
    
    // Generate receipt data
    const receiptData = generateReceiptData(printData);
    
    // Write to printer
    const success = await writeDataToPrinter(connectedDevice, receiptData);
    
    if (!success) {
      Alert.alert('Print Failed', 'Could not send data to printer.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Print Error', 'Failed to print receipt.');
    return false;
  }
};

// Test print
export const testPrint = async (): Promise<boolean> => {
  const manager = getBleManager();
  
  if (!manager) {
    Alert.alert('Development Build Required', 'BLE printing requires a Development Build.');
    return false;
  }
  
  try {
    const savedPrinter = await getSavedPrinter();
    
    if (!savedPrinter) {
      Alert.alert('No Printer', 'Please configure a printer first.');
      return false;
    }
    
    // Connect if not connected
    if (!connectedDevice || !(await connectedDevice.isConnected())) {
      const connected = await connectToPrinter(savedPrinter.macAddress);
      if (!connected) {
        Alert.alert('Connection Failed', 'Could not connect to printer.');
        return false;
      }
    }
    
    // Generate test print data
    let data: number[] = [];
    data = data.concat(COMMANDS.INIT);
    data = data.concat(COMMANDS.ALIGN_CENTER);
    data = data.concat(COMMANDS.DOUBLE_SIZE_ON);
    data = data.concat(COMMANDS.BOLD_ON);
    data = data.concat(stringToBytes('*** TEST PRINT ***'));
    data = data.concat(COMMANDS.FEED_LINE);
    data = data.concat(COMMANDS.NORMAL_SIZE);
    data = data.concat(COMMANDS.BOLD_OFF);
    data = data.concat(stringToBytes('--------------------------------'));
    data = data.concat(COMMANDS.FEED_LINE);
    data = data.concat(stringToBytes('Tap-Bill POS System'));
    data = data.concat(COMMANDS.FEED_LINE);
    data = data.concat(stringToBytes('Printer Connected!'));
    data = data.concat(COMMANDS.FEED_LINE);
    data = data.concat(stringToBytes('--------------------------------'));
    data = data.concat(COMMANDS.FEED_LINE);
    data = data.concat(stringToBytes(new Date().toLocaleString()));
    data = data.concat(COMMANDS.FEED_LINE);
    data = data.concat(COMMANDS.FEED_LINE);
    data = data.concat(COMMANDS.FEED_LINE);
    data = data.concat(COMMANDS.FEED_LINE);
    
    const success = await writeDataToPrinter(connectedDevice, data);
    
    if (success) {
      Alert.alert('Success', 'Test page printed!');
      return true;
    } else {
      Alert.alert('Failed', 'Could not print test page.');
      return false;
    }
  } catch (error) {
    console.error('Test print error:', error);
    Alert.alert('Error', 'Test print failed.');
    return false;
  }
};
