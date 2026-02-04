import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { getOrdersByDateRange } from '../../services/storage';
import type { Order } from '../../services/storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as CSV from 'react-native-csv';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const fetchedOrders = await getOrdersByDateRange(startDate, endDate);
      setOrders(fetchedOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = async () => {
    try {
      if (orders.length === 0) {
        Alert.alert('No Data', 'There are no orders to export.');
        return;
      }

      // Prepare CSV data
      const csvData = orders.map(order => ({
        'Order ID': order.id,
        'Date/Time': formatDateTime(order.timestamp),
        'Customer Name': order.customerName,
        'Customer Phone': order.customerPhone,
        'Table/Token': order.tableToken,
        'Items': order.items.map(item => `${item.quantity}x ${item.menuItem.name}`).join(', '),
        'Total Amount': order.totalAmount.toFixed(2),
        'Payment Mode': order.paymentMode,
        'Notes': order.notes || '',
      }));

      // Convert to CSV string
      const csv = CSV.csvFormat(csvData);
      
      // Save to file
      const fileName = `orders_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert('Success', `Report saved to ${filePath}`);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export report. Please try again.');
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const cashOrders = orders.filter(o => o.paymentMode === 'Cash');
  const upiOrders = orders.filter(o => o.paymentMode === 'UPI');

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <View style={styles.dateFilterRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>

          <Text style={styles.dateSeparator}>to</Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartPicker(Platform.OS === 'ios');
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndPicker(Platform.OS === 'ios');
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}

        <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
          <Ionicons name="download-outline" size={20} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Orders</Text>
          <Text style={styles.summaryValue}>{orders.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>₹{totalRevenue.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.paymentSummary}>
        <View style={[styles.paymentCard, { borderLeftColor: '#34C759' }]}>
          <Text style={styles.paymentLabel}>Cash</Text>
          <Text style={styles.paymentValue}>{cashOrders.length} orders</Text>
          <Text style={styles.paymentAmount}>
            ₹{cashOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}
          </Text>
        </View>
        <View style={[styles.paymentCard, { borderLeftColor: '#007AFF' }]}>
          <Text style={styles.paymentLabel}>UPI</Text>
          <Text style={styles.paymentValue}>{upiOrders.length} orders</Text>
          <Text style={styles.paymentAmount}>
            ₹{upiOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.ordersList}>
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>Try adjusting the date range</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {orders.map((order) => (
              <View key={order.id} style={styles.tableRow}>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellLabel}>Order ID</Text>
                  <Text style={styles.tableCellValue}>#{order.id}</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellLabel}>Date/Time</Text>
                  <Text style={styles.tableCellValue}>{formatDateTime(order.timestamp)}</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellLabel}>Customer</Text>
                  <Text style={styles.tableCellValue}>{order.customerName}</Text>
                  {order.customerPhone && (
                    <Text style={styles.tableCellSubvalue}>{order.customerPhone}</Text>
                  )}
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellLabel}>Items</Text>
                  {order.items.map((item, idx) => (
                    <Text key={idx} style={styles.tableCellValue}>
                      {item.quantity}x {item.menuItem.name}
                    </Text>
                  ))}
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellLabel}>Total</Text>
                  <Text style={[styles.tableCellValue, styles.amountText]}>
                    ₹{order.totalAmount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellLabel}>Payment</Text>
                  <View style={[styles.paymentBadge, order.paymentMode === 'Cash' ? styles.cashBadge : styles.upiBadge]}>
                    <Text style={styles.paymentBadgeText}>{order.paymentMode}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  dateSeparator: {
    fontSize: 14,
    color: '#8E8E93',
    marginHorizontal: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  paymentSummary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  paymentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  ordersList: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
  },
  tableContainer: {
    padding: 16,
    gap: 12,
  },
  tableRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tableCell: {
    gap: 4,
  },
  tableCellLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tableCellValue: {
    fontSize: 14,
    color: '#000000',
  },
  tableCellSubvalue: {
    fontSize: 12,
    color: '#8E8E93',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  paymentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cashBadge: {
    backgroundColor: '#34C759',
  },
  upiBadge: {
    backgroundColor: '#007AFF',
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
