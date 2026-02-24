import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import type { Order, Settings } from './storage';

export interface PrintData {
  order: Order;
  settings: Settings;
}

// Generate HTML receipt
const generateReceiptHTML = (printData: PrintData): string => {
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

  // Generate items rows
  const itemsHTML = order.items
    .map(
      (item) => `
      <tr>
        <td style="text-align: left;">${item.menuItem.name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">₹${(item.quantity * item.menuItem.price).toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  // Logo HTML (if base64 exists)
  const logoHTML = settings.logoBase64
    ? `<img src="${settings.logoBase64}" style="max-width: 80px; max-height: 80px; margin-bottom: 10px;" />`
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            max-width: 300px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .business-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .business-info {
            font-size: 10px;
            color: #333;
          }
          .order-details {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #000;
          }
          .order-details p {
            margin: 3px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th {
            border-bottom: 1px solid #000;
            padding: 5px 0;
            font-size: 11px;
          }
          td {
            padding: 5px 0;
            font-size: 11px;
          }
          .total-row {
            border-top: 1px dashed #000;
            font-weight: bold;
            font-size: 14px;
          }
          .total-row td {
            padding-top: 10px;
          }
          .payment-info {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed #000;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #000;
            font-size: 11px;
          }
          .notes {
            margin-top: 10px;
            font-style: italic;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoHTML}
          ${settings.businessName ? `<div class="business-name">${settings.businessName}</div>` : ''}
          ${settings.address ? `<div class="business-info">${settings.address}</div>` : ''}
          ${settings.phone ? `<div class="business-info">Tel: ${settings.phone}</div>` : ''}
          ${settings.email ? `<div class="business-info">${settings.email}</div>` : ''}
          ${settings.gstNumber ? `<div class="business-info">GST: ${settings.gstNumber}</div>` : ''}
        </div>

        <div class="order-details">
          <p><strong>Order #${order.id}</strong></p>
          <p>Date: ${formattedDate}</p>
          <p>Time: ${formattedTime}</p>
          ${order.customerName ? `<p>Customer: ${order.customerName}</p>` : ''}
          ${order.customerPhone ? `<p>Phone: ${order.customerPhone}</p>` : ''}
          ${order.tableToken ? `<p>Table/Token: ${order.tableToken}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
            <tr class="total-row">
              <td colspan="2" style="text-align: left;"><strong>TOTAL</strong></td>
              <td style="text-align: right;"><strong>₹${order.totalAmount.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="payment-info">
          <p><strong>Payment Mode:</strong> ${order.paymentMode}</p>
        </div>

        ${order.notes ? `<div class="notes"><strong>Notes:</strong> ${order.notes}</div>` : ''}

        <div class="footer">
          <p>Thank you for your order!</p>
          <p>Please visit again</p>
        </div>
      </body>
    </html>
  `;
};

// Print receipt using expo-print
export const printReceipt = async (printData: PrintData): Promise<void> => {
  try {
    const html = generateReceiptHTML(printData);

    if (Platform.OS === 'web') {
      // For web, open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      } else {
        Alert.alert('Error', 'Please allow pop-ups to print receipts.');
      }
      return;
    }

    // For mobile, use expo-print
    await Print.printAsync({
      html,
      width: 300, // Receipt width in points (about 80mm)
    });

  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Print Error', 'Failed to print receipt. Please try again.');
  }
};

// Generate PDF and share
export const shareReceipt = async (printData: PrintData): Promise<void> => {
  try {
    const html = generateReceiptHTML(printData);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      width: 300,
    });

    // Check if sharing is available
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Receipt #${printData.order.id}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
    }
  } catch (error) {
    console.error('Share error:', error);
    Alert.alert('Share Error', 'Failed to share receipt. Please try again.');
  }
};

// Preview receipt (returns HTML string for display)
export const getReceiptHTML = (printData: PrintData): string => {
  return generateReceiptHTML(printData);
};
