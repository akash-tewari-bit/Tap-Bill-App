import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { getOrdersByDateRange } from '../../services/storage';
import type { Order } from '../../services/storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, [loadOrders]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

        {showStartPicker && Platform.OS === 'ios' && (
          <View style={styles.iosPickerContainer}>
            <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={startDate}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setStartDate(selectedDate);
                }
              }}
            />
          </View>
        )}

        {showStartPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
              }
            }}
          />
        )}

        {showEndPicker && Platform.OS === 'ios' && (
          <View style={styles.iosPickerContainer}>
            <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={endDate}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setEndDate(selectedDate);
                }
              }}
            />
          </View>
        )}

        {showEndPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }}
          />
        )}
      </View>

      <ScrollView
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>Try adjusting the date range</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderIdContainer}>
                  <Text style={styles.orderId}>#{order.id}</Text>
                  <View style={[styles.paymentBadge, order.paymentMode === 'Cash' ? styles.cashBadge : styles.upiBadge]}>
                    <Ionicons
                      name={order.paymentMode === 'Cash' ? 'cash-outline' : 'card-outline'}
                      size={12}
                      color="#FFFFFF"
                    />
                    <Text style={styles.paymentBadgeText}>{order.paymentMode}</Text>
                  </View>
                </View>
                <Text style={styles.orderAmount}>₹{order.totalAmount.toFixed(2)}</Text>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.orderDetailRow}>
                  <Ionicons name="person-outline" size={16} color="#8E8E93" />
                  <Text style={styles.orderDetailText}>{order.customerName}</Text>
                </View>
                {order.customerPhone && (
                  <View style={styles.orderDetailRow}>
                    <Ionicons name="call-outline" size={16} color="#8E8E93" />
                    <Text style={styles.orderDetailText}>{order.customerPhone}</Text>
                  </View>
                )}
                {order.tableToken && (
                  <View style={styles.orderDetailRow}>
                    <Ionicons name="restaurant-outline" size={16} color="#8E8E93" />
                    <Text style={styles.orderDetailText}>Table: {order.tableToken}</Text>
                  </View>
                )}
                <View style={styles.orderDetailRow}>
                  <Ionicons name="time-outline" size={16} color="#8E8E93" />
                  <Text style={styles.orderDetailText}>{formatDateTime(order.timestamp)}</Text>
                </View>
              </View>

              <View style={styles.orderItems}>
                {order.items.map((item, index) => (
                  <Text key={index} style={styles.orderItemText}>
                    {item.quantity}x {item.menuItem.name}
                  </Text>
                ))}
              </View>

              {order.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{order.notes}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/create-order')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F8F8F8',
  },
  iosPickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  ordersList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
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
  orderCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  cashBadge: {
    backgroundColor: '#34C759',
  },
  upiBadge: {
    backgroundColor: '#007AFF',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
  },
  orderDetails: {
    gap: 8,
    marginBottom: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  orderItems: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  orderItemText: {
    fontSize: 14,
    color: '#000000',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#000000',
    fontStyle: 'italic',
  },
  createButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
