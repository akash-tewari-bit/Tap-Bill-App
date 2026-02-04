import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { getMenuItems, saveOrder, getSettings } from '../services/storage';
import type { MenuItem, Order, OrderItem, Settings } from '../services/storage';
import { Ionicons } from '@expo/vector-icons';

export default function CreateOrder() {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableToken, setTableToken] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI'>('Cash');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const items = await getMenuItems();
    setMenuItems(items);
    const businessSettings = await getSettings();
    setSettings(businessSettings);
  };

  const groupedMenuItems = useMemo(() => {
    const groups: { [category: string]: MenuItem[] } = {};
    menuItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [menuItems]);

  const updateQuantity = (itemId: string, delta: number) => {
    const newSelected = new Map(selectedItems);
    const currentQty = newSelected.get(itemId) || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    if (newQty === 0) {
      newSelected.delete(itemId);
    } else {
      newSelected.set(itemId, newQty);
    }
    
    setSelectedItems(newSelected);
  };

  const totalAmount = useMemo(() => {
    let total = 0;
    selectedItems.forEach((quantity, itemId) => {
      const item = menuItems.find((m) => m.id === itemId);
      if (item) {
        total += item.price * quantity;
      }
    });
    return total;
  }, [selectedItems, menuItems]);

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      Alert.alert('Validation Error', 'Please enter customer name.');
      return;
    }

    if (selectedItems.size === 0) {
      Alert.alert('Validation Error', 'Please select at least one item.');
      return;
    }

    const orderItems: OrderItem[] = [];
    selectedItems.forEach((quantity, itemId) => {
      const item = menuItems.find((m) => m.id === itemId);
      if (item) {
        orderItems.push({ menuItem: item, quantity });
      }
    });

    const order: Order = {
      id: Date.now().toString(),
      customerName,
      customerPhone,
      tableToken,
      notes,
      items: orderItems,
      totalAmount,
      paymentMode,
      timestamp: new Date().toISOString(),
    };

    try {
      await saveOrder(order);
      
      // Prepare for Bluetooth printing
      await preparePrintData(order);
      
      Alert.alert(
        'Success',
        'Order created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving order:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    }
  };

  const preparePrintData = async (order: Order) => {
    // Prepare bill data for Bluetooth printing
    const billData = {
      businessName: settings?.businessName || 'My Food Cart',
      businessLogo: settings?.businessLogo || '',
      address: settings?.address || '',
      phone: settings?.phone || '',
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      tableToken: order.tableToken,
      items: order.items.map(item => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.menuItem.price,
        total: item.quantity * item.menuItem.price,
      })),
      totalAmount: order.totalAmount,
      paymentMode: order.paymentMode,
      timestamp: order.timestamp,
    };

    // Note: Actual Bluetooth printing would be implemented here
    // using react-native-bluetooth-escpos-printer
    console.log('Bill data prepared for printing:', billData);
    
    // For now, we're just logging the data
    // In a real implementation, you would:
    // 1. Connect to Bluetooth printer
    // 2. Format the bill using ESC/POS commands
    // 3. Send to printer
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        {/* Customer Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Enter customer name"
              placeholderTextColor="#C7C7CC"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Enter phone number"
              placeholderTextColor="#C7C7CC"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Table/Token Number</Text>
            <TextInput
              style={styles.input}
              value={tableToken}
              onChangeText={setTableToken}
              placeholder="Enter table or token number"
              placeholderTextColor="#C7C7CC"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes/Special Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter any special instructions"
              placeholderTextColor="#C7C7CC"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Menu Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Items</Text>
          
          {Object.keys(groupedMenuItems).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="fast-food-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyText}>No menu items available</Text>
              <Text style={styles.emptySubtext}>Please add menu items in Settings</Text>
            </View>
          ) : (
            Object.entries(groupedMenuItems).map(([category, items]) => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {items.map((item) => {
                  const quantity = selectedItems.get(item.id) || 0;
                  return (
                    <View key={item.id} style={styles.menuItemCard}>
                      <View style={styles.menuItemContent}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.menuItemImage} />
                        ) : (
                          <View style={styles.menuItemImagePlaceholder}>
                            <Ionicons name="fast-food" size={24} color="#8E8E93" />
                          </View>
                        )}
                        <View style={styles.menuItemInfo}>
                          <Text style={styles.menuItemName}>{item.name}</Text>
                          <Text style={styles.menuItemPrice}>₹{item.price.toFixed(2)}</Text>
                        </View>
                      </View>
                      <View style={styles.quantityControls}>
                        {quantity === 0 ? (
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => updateQuantity(item.id, 1)}
                          >
                            <Text style={styles.addButtonText}>Add</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.quantityBox}>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={() => updateQuantity(item.id, -1)}
                            >
                              <Ionicons name="remove" size={20} color="#007AFF" />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{quantity}</Text>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={() => updateQuantity(item.id, 1)}
                            >
                              <Ionicons name="add" size={20} color="#007AFF" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>

        {/* Payment Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Mode</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[styles.paymentOption, paymentMode === 'Cash' && styles.paymentOptionActive]}
              onPress={() => setPaymentMode('Cash')}
            >
              <Ionicons
                name="cash"
                size={24}
                color={paymentMode === 'Cash' ? '#FFFFFF' : '#34C759'}
              />
              <Text style={[styles.paymentOptionText, paymentMode === 'Cash' && styles.paymentOptionTextActive]}>
                Cash
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOption, paymentMode === 'UPI' && styles.paymentOptionActive]}
              onPress={() => setPaymentMode('UPI')}
            >
              <Ionicons
                name="card"
                size={24}
                color={paymentMode === 'UPI' ? '#FFFFFF' : '#007AFF'}
              />
              <Text style={[styles.paymentOptionText, paymentMode === 'UPI' && styles.paymentOptionTextActive]}>
                UPI
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitButton, selectedItems.size === 0 && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={selectedItems.size === 0}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>Create Order</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  menuItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  menuItemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34C759',
  },
  quantityControls: {
    marginLeft: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quantityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    padding: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    paddingHorizontal: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  paymentOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  paymentOptionTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 120,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
