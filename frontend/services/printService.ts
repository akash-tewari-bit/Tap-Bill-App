import { 
  BluetoothManager, 
  BluetoothEscposPrinter 
} from 'react-native-bluetooth-escpos-printer';
import { Alert, Platform } from 'react-native';
import type { Order, Settings } from './storage';

export interface PrintData {
  order: Order;
  settings: Settings;
}

// Connect to Bluetooth printer
export const connectToPrinter = async (): Promise<boolean> => {
  try {
    // Check if Bluetooth is enabled
    const isEnabled = await BluetoothManager.isBluetoothEnabled();
    
    if (!isEnabled) {
      Alert.alert(
        'Bluetooth Disabled',
        'Please enable Bluetooth to print receipts.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Scan for devices
    const devices = await BluetoothManager.enableBluetooth();
    
    if (devices && devices.length > 0) {
      // Show device selection dialog (simplified - you can enhance this)
      return true;
    } else {
      Alert.alert(
        'No Printers Found',
        'Please pair your Bluetooth printer in device settings first.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('Bluetooth connection error:', error);
    Alert.alert('Error', 'Failed to connect to printer');
    return false;
  }
};

// Print receipt
export const printReceipt = async (printData: PrintData): Promise<void> => {
  try {
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

    // Start printing
    await BluetoothEscposPrinter.printerInit();
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);

    // Print logo if base64 exists (skip for now as ESC/POS image printing is complex)
    // You'd need to convert base64 to bitmap for ESC/POS
    
    // Print business name
    if (settings.businessName) {
      await BluetoothEscposPrinter.setBlob(0);
      await BluetoothEscposPrinter.printText(settings.businessName + '\n', {
        encoding: 'GBK',
        codepage: 0,
        widthtimes: 1,
        heigthtimes: 1,
        fonttype: 1,
      });
    }

    // Print address
    if (settings.address) {
      await BluetoothEscposPrinter.printText(settings.address + '\n', {});
    }

    // Print phone
    if (settings.phone) {
      await BluetoothEscposPrinter.printText('Phone: ' + settings.phone + '\n', {});
    }

    // Print email
    if (settings.email) {
      await BluetoothEscposPrinter.printText('Email: ' + settings.email + '\n', {});
    }

    // Print GST
    if (settings.gstNumber) {
      await BluetoothEscposPrinter.printText('GST: ' + settings.gstNumber + '\n', {});
    }

    // Print separator
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Print order details
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    await BluetoothEscposPrinter.printText('Order ID: #' + order.id + '\n', {});
    await BluetoothEscposPrinter.printText('Date: ' + formattedDate + '\n', {});
    await BluetoothEscposPrinter.printText('Time: ' + formattedTime + '\n', {});
    
    if (order.customerName) {
      await BluetoothEscposPrinter.printText('Customer: ' + order.customerName + '\n', {});
    }
    
    if (order.customerPhone) {
      await BluetoothEscposPrinter.printText('Phone: ' + order.customerPhone + '\n', {});
    }
    
    if (order.tableToken) {
      await BluetoothEscposPrinter.printText('Table/Token: ' + order.tableToken + '\n', {});
    }

    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Print items header
    await BluetoothEscposPrinter.printColumn(
      [20, 6, 6],
      [
        BluetoothEscposPrinter.ALIGN.LEFT,
        BluetoothEscposPrinter.ALIGN.CENTER,
        BluetoothEscposPrinter.ALIGN.RIGHT,
      ],
      ['Item', 'Qty', 'Amount'],
      {}
    );
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Print each item
    for (const item of order.items) {
      const itemTotal = item.quantity * item.menuItem.price;
      await BluetoothEscposPrinter.printColumn(
        [20, 6, 6],
        [
          BluetoothEscposPrinter.ALIGN.LEFT,
          BluetoothEscposPrinter.ALIGN.CENTER,
          BluetoothEscposPrinter.ALIGN.RIGHT,
        ],
        [
          item.menuItem.name,
          item.quantity.toString(),
          '₹' + itemTotal.toFixed(2),
        ],
        {}
      );
    }

    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Print total
    await BluetoothEscposPrinter.printColumn(
      [20, 12],
      [
        BluetoothEscposPrinter.ALIGN.LEFT,
        BluetoothEscposPrinter.ALIGN.RIGHT,
      ],
      ['TOTAL:', '₹' + order.totalAmount.toFixed(2)],
      { fonttype: 1 }
    );

    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Print payment mode
    await BluetoothEscposPrinter.printText('Payment Mode: ' + order.paymentMode + '\n', {});

    // Print notes if any
    if (order.notes) {
      await BluetoothEscposPrinter.printText('\nNotes: ' + order.notes + '\n', {});
    }

    // Print footer
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText('\n', {});
    await BluetoothEscposPrinter.printText('Thank you for your order!\n', {});
    await BluetoothEscposPrinter.printText('\n\n\n', {});

    // Cut paper (if printer supports it)
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);

    Alert.alert('Success', 'Receipt printed successfully!');
  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Print Error', 'Failed to print receipt. Please check printer connection.');
  }
};

// List available Bluetooth devices
export const listBluetoothDevices = async () => {
  try {
    const devices = await BluetoothManager.list();
    return devices;
  } catch (error) {
    console.error('Error listing devices:', error);
    return [];
  }
};

// Connect to specific device
export const connectToDevice = async (address: string): Promise<boolean> => {
  try {
    await BluetoothManager.connect(address);
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
  }
};
