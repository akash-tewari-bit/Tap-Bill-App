import { Platform, Alert, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Order, Settings } from './storage';

// Storage key for saved printer
const PRINTER_STORAGE_KEY = '@saved_printer';

export interface PrinterDevice {
  deviceName: string;
  macAddress: string;
  bondState?: string;
}

export interface PrintData {
  order: Order;
  settings: Settings;
}

export interface SavedPrinter {
  deviceName: string;
  macAddress: string;
}

// Check if we're in a native environment
const isNativeEnvironment = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

// Get the thermal printer module (only works in development build)
const getThermalPrinterModule = () => {
  try {
    const { BluetoothManager, BluetoothEscposPrinter } = require('react-native-thermal-receipt-printer');
    return { BluetoothManager, BluetoothEscposPrinter };
  } catch (error) {
    console.log('Thermal printer module not available');
    return null;
  }
};

// Request Bluetooth permissions (Android)
export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    
    return (
      granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};

// Check if Bluetooth is enabled
export const isBluetoothEnabled = async (): Promise<boolean> => {
  const module = getThermalPrinterModule();
  if (!module) return false;
  
  try {
    const isEnabled = await module.BluetoothManager.isBluetoothEnabled();
    return isEnabled;
  } catch (error) {
    console.error('Bluetooth check error:', error);
    return false;
  }
};

// Enable Bluetooth
export const enableBluetooth = async (): Promise<boolean> => {
  const module = getThermalPrinterModule();
  if (!module) return false;
  
  try {
    await module.BluetoothManager.enableBluetooth();
    return true;
  } catch (error) {
    console.error('Enable Bluetooth error:', error);
    return false;
  }
};

// Scan for Bluetooth devices
export const scanBluetoothDevices = async (): Promise<PrinterDevice[]> => {
  const module = getThermalPrinterModule();
  if (!module) {
    Alert.alert('Not Available', 'Bluetooth printing requires a Development Build. Please run: npx expo run:android or npx expo run:ios');
    return [];
  }
  
  try {
    // Request permissions first
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Bluetooth permissions are required to scan for printers.');
      return [];
    }
    
    // Check if Bluetooth is enabled
    const isEnabled = await isBluetoothEnabled();
    if (!isEnabled) {
      const enabled = await enableBluetooth();
      if (!enabled) {
        Alert.alert('Bluetooth Disabled', 'Please enable Bluetooth to scan for printers.');
        return [];
      }
    }
    
    // Get paired devices
    const pairedDevices = await module.BluetoothManager.scanDevices();
    
    if (typeof pairedDevices === 'string') {
      const parsed = JSON.parse(pairedDevices);
      const paired = parsed.paired || [];
      return paired.map((d: any) => ({
        deviceName: d.name || 'Unknown Device',
        macAddress: d.address,
        bondState: 'bonded',
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Scan error:', error);
    Alert.alert('Scan Error', 'Failed to scan for Bluetooth devices.');
    return [];
  }
};

// Get already paired devices (Android)
export const getPairedDevices = async (): Promise<PrinterDevice[]> => {
  const module = getThermalPrinterModule();
  if (!module) {
    return [];
  }
  
  try {
    // Request permissions first
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      return [];
    }
    
    // Check if Bluetooth is enabled
    const isEnabled = await isBluetoothEnabled();
    if (!isEnabled) {
      await enableBluetooth();
    }
    
    // Get paired devices - this is faster than scanning
    const result = await module.BluetoothManager.scanDevices();
    
    if (typeof result === 'string') {
      const parsed = JSON.parse(result);
      const paired = parsed.paired || [];
      
      // Filter to show likely printer devices (optional)
      return paired.map((d: any) => ({
        deviceName: d.name || 'Unknown Device',
        macAddress: d.address,
        bondState: 'bonded',
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Get paired devices error:', error);
    return [];
  }
};

// Connect to a printer
export const connectToPrinter = async (macAddress: string): Promise<boolean> => {
  const module = getThermalPrinterModule();
  if (!module) return false;
  
  try {
    await module.BluetoothManager.connect(macAddress);
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
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
};

// Generate receipt text for thermal printer
const generateReceiptCommands = async (
  printData: PrintData,
  EscposPrinter: any
): Promise<void> => {
  const { order, settings } = printData;

  // Format date and time
  const orderDate = new Date(order.timestamp);
  const formattedDate = orderDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Initialize printer
  await EscposPrinter.printerInit();
  await EscposPrinter.printerAlign(EscposPrinter.ALIGN.CENTER);

  // Print business name (large, bold)
  if (settings.businessName) {
    await EscposPrinter.printText(`${settings.businessName}\n`, {
      encoding: 'GBK',
      codepage: 0,
      widthtimes: 2,
      heigthtimes: 2,
      fonttype: 1,
    });
  }

  // Print address
  if (settings.address) {
    await EscposPrinter.printText(`${settings.address}\n`, {});
  }

  // Print phone
  if (settings.phone) {
    await EscposPrinter.printText(`Tel: ${settings.phone}\n`, {});
  }

  // Print GST
  if (settings.gstNumber) {
    await EscposPrinter.printText(`GST: ${settings.gstNumber}\n`, {});
  }

  // Separator
  await EscposPrinter.printText('--------------------------------\n', {});

  // Order details (left aligned)
  await EscposPrinter.printerAlign(EscposPrinter.ALIGN.LEFT);
  await EscposPrinter.printText(`Order #${order.id}\n`, { fonttype: 1 });
  await EscposPrinter.printText(`Date: ${formattedDate}\n`, {});
  await EscposPrinter.printText(`Time: ${formattedTime}\n`, {});

  if (order.customerName) {
    await EscposPrinter.printText(`Customer: ${order.customerName}\n`, {});
  }
  if (order.customerPhone) {
    await EscposPrinter.printText(`Phone: ${order.customerPhone}\n`, {});
  }
  if (order.tableToken) {
    await EscposPrinter.printText(`Table/Token: ${order.tableToken}\n`, {});
  }

  // Separator
  await EscposPrinter.printText('--------------------------------\n', {});

  // Items header
  await EscposPrinter.printColumn(
    [16, 6, 10],
    [EscposPrinter.ALIGN.LEFT, EscposPrinter.ALIGN.CENTER, EscposPrinter.ALIGN.RIGHT],
    ['Item', 'Qty', 'Amount'],
    { fonttype: 1 }
  );
  await EscposPrinter.printText('--------------------------------\n', {});

  // Print each item
  for (const item of order.items) {
    const itemTotal = item.quantity * item.menuItem.price;
    const itemName = item.menuItem.name.length > 14 
      ? item.menuItem.name.substring(0, 14) 
      : item.menuItem.name;
    
    await EscposPrinter.printColumn(
      [16, 6, 10],
      [EscposPrinter.ALIGN.LEFT, EscposPrinter.ALIGN.CENTER, EscposPrinter.ALIGN.RIGHT],
      [itemName, item.quantity.toString(), `Rs.${itemTotal.toFixed(0)}`],
      {}
    );
  }

  // Separator and total
  await EscposPrinter.printText('--------------------------------\n', {});
  await EscposPrinter.printColumn(
    [16, 16],
    [EscposPrinter.ALIGN.LEFT, EscposPrinter.ALIGN.RIGHT],
    ['TOTAL:', `Rs.${order.totalAmount.toFixed(0)}`],
    { fonttype: 1, widthtimes: 1, heigthtimes: 1 }
  );
  await EscposPrinter.printText('--------------------------------\n', {});

  // Payment mode
  await EscposPrinter.printText(`Payment: ${order.paymentMode}\n`, {});

  // Notes
  if (order.notes) {
    await EscposPrinter.printText(`Notes: ${order.notes}\n`, {});
  }

  // Footer
  await EscposPrinter.printText('\n', {});
  await EscposPrinter.printerAlign(EscposPrinter.ALIGN.CENTER);
  await EscposPrinter.printText('Thank you for your order!\n', {});
  await EscposPrinter.printText('Please visit again\n', {});
  
  // Feed and cut
  await EscposPrinter.printText('\n\n\n', {});
};

// Print receipt directly to connected printer
export const printReceipt = async (printData: PrintData): Promise<boolean> => {
  const module = getThermalPrinterModule();
  
  if (!module) {
    Alert.alert(
      'Development Build Required',
      'Direct Bluetooth printing requires a Development Build.\n\nRun: npx expo run:android\nor: npx expo run:ios',
      [{ text: 'OK' }]
    );
    return false;
  }
  
  try {
    // Get saved printer
    const savedPrinter = await getSavedPrinter();
    
    if (!savedPrinter) {
      Alert.alert(
        'No Printer Configured',
        'Please configure a printer in Settings first.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    // Check Bluetooth
    const isEnabled = await isBluetoothEnabled();
    if (!isEnabled) {
      const enabled = await enableBluetooth();
      if (!enabled) {
        Alert.alert('Bluetooth Disabled', 'Please enable Bluetooth to print.');
        return false;
      }
    }
    
    // Connect to printer
    const connected = await connectToPrinter(savedPrinter.macAddress);
    if (!connected) {
      Alert.alert(
        'Connection Failed',
        `Could not connect to ${savedPrinter.deviceName}. Please check if the printer is on and nearby.`,
        [{ text: 'OK' }]
      );
      return false;
    }
    
    // Print the receipt
    await generateReceiptCommands(printData, module.BluetoothEscposPrinter);
    
    return true;
  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Print Error', 'Failed to print receipt. Please check printer connection.');
    return false;
  }
};

// Test print (prints a test page)
export const testPrint = async (): Promise<boolean> => {
  const module = getThermalPrinterModule();
  
  if (!module) {
    Alert.alert('Development Build Required', 'Direct Bluetooth printing requires a Development Build.');
    return false;
  }
  
  try {
    const savedPrinter = await getSavedPrinter();
    
    if (!savedPrinter) {
      Alert.alert('No Printer', 'Please configure a printer first.');
      return false;
    }
    
    // Connect
    const connected = await connectToPrinter(savedPrinter.macAddress);
    if (!connected) {
      Alert.alert('Connection Failed', 'Could not connect to printer.');
      return false;
    }
    
    // Print test page
    const EscposPrinter = module.BluetoothEscposPrinter;
    await EscposPrinter.printerInit();
    await EscposPrinter.printerAlign(EscposPrinter.ALIGN.CENTER);
    await EscposPrinter.printText('*** TEST PRINT ***\n', { fonttype: 1, widthtimes: 1, heigthtimes: 1 });
    await EscposPrinter.printText('--------------------------------\n', {});
    await EscposPrinter.printText('Tap-Bill POS System\n', {});
    await EscposPrinter.printText('Printer Connected Successfully!\n', {});
    await EscposPrinter.printText('--------------------------------\n', {});
    await EscposPrinter.printText(`${new Date().toLocaleString()}\n`, {});
    await EscposPrinter.printText('\n\n\n', {});
    
    Alert.alert('Success', 'Test page printed successfully!');
    return true;
  } catch (error) {
    console.error('Test print error:', error);
    Alert.alert('Print Error', 'Failed to print test page.');
    return false;
  }
};
