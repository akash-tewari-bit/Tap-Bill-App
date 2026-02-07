import React, { useState, useEffect, useCallback } from 'react';
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
import { getSettings, saveSettings, getMenuItems, saveMenuItem, deleteMenuItem } from '../../services/storage';
import type { Settings, MenuItem } from '../../services/storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    businessName: '',
    businessLogo: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);

  const loadData = useCallback(async () => {
    const savedSettings = await getSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
    const items = await getMenuItems();
    setMenuItems(items);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pickImage = async (type: 'logo' | 'menuItem') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      
      if (type === 'logo') {
        setSettings({ ...settings, businessLogo: base64Image });
      } else if (editingItem) {
        setEditingItem({ ...editingItem, image: base64Image });
      }
    }
  };

  const saveBusinessSettings = async () => {
    try {
      await saveSettings(settings);
      Alert.alert('Success', 'Business settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleSaveMenuItem = async () => {
    if (!editingItem) return;

    if (!editingItem.name || !editingItem.category || editingItem.price <= 0) {
      Alert.alert('Validation Error', 'Please fill all required fields with valid data.');
      return;
    }

    try {
      await saveMenuItem(editingItem);
      await loadData();
      setEditingItem(null);
      setShowAddItem(false);
      Alert.alert('Success', 'Menu item saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save menu item. Please try again.');
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMenuItem(id);
              await loadData();
              Alert.alert('Success', 'Menu item deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete menu item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const startAddNewItem = () => {
    setEditingItem({
      id: Date.now().toString(),
      name: '',
      price: 0,
      image: '',
      category: '',
    });
    setShowAddItem(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        {/* Business Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          
          <TouchableOpacity style={styles.logoContainer} onPress={() => pickImage('logo')}>
            {settings.businessLogo ? (
              <Image source={{ uri: settings.businessLogo }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera" size={32} color="#8E8E93" />
                <Text style={styles.logoPlaceholderText}>Tap to upload logo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={settings.businessName}
              onChangeText={(text) => setSettings({ ...settings, businessName: text })}
              placeholder="Enter business name"
              placeholderTextColor="#C7C7CC"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={settings.address}
              onChangeText={(text) => setSettings({ ...settings, address: text })}
              placeholder="Enter business address"
              placeholderTextColor="#C7C7CC"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone *</Text>
            <TextInput
              style={styles.input}
              value={settings.phone}
              onChangeText={(text) => setSettings({ ...settings, phone: text })}
              placeholder="Enter phone number"
              placeholderTextColor="#C7C7CC"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={settings.email}
              onChangeText={(text) => setSettings({ ...settings, email: text })}
              placeholder="Enter email address"
              placeholderTextColor="#C7C7CC"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>GST Number</Text>
            <TextInput
              style={styles.input}
              value={settings.gstNumber}
              onChangeText={(text) => setSettings({ ...settings, gstNumber: text })}
              placeholder="Enter GST number"
              placeholderTextColor="#C7C7CC"
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveBusinessSettings}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Business Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu Items</Text>
            <TouchableOpacity style={styles.addButton} onPress={startAddNewItem}>
              <Ionicons name="add-circle" size={24} color="#007AFF" />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {menuItems.map((item) => (
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
                  <Text style={styles.menuItemCategory}>{item.category}</Text>
                  <Text style={styles.menuItemPrice}>₹{item.price.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.menuItemActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setEditingItem(item);
                    setShowAddItem(true);
                  }}
                >
                  <Ionicons name="create" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteMenuItem(item.id)}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {menuItems.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="fast-food-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyText}>No menu items yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Item" to create your first menu item</Text>
            </View>
          )}
        </View>

        {/* Edit/Add Menu Item Modal */}
        {showAddItem && editingItem && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem.id && menuItems.find(i => i.id === editingItem.id) ? 'Edit' : 'Add'} Menu Item
                </Text>
                <TouchableOpacity onPress={() => { setShowAddItem(false); setEditingItem(null); }}>
                  <Ionicons name="close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity
                  style={styles.modalImageContainer}
                  onPress={() => pickImage('menuItem')}
                >
                  {editingItem.image ? (
                    <Image source={{ uri: editingItem.image }} style={styles.modalImage} />
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <Ionicons name="camera" size={32} color="#8E8E93" />
                      <Text style={styles.modalImagePlaceholderText}>Tap to add image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Item Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={editingItem.name}
                    onChangeText={(text) => setEditingItem({ ...editingItem, name: text })}
                    placeholder="Enter item name"
                    placeholderTextColor="#C7C7CC"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <TextInput
                    style={styles.input}
                    value={editingItem.category}
                    onChangeText={(text) => setEditingItem({ ...editingItem, category: text })}
                    placeholder="e.g., Snacks, Beverages, Main Course"
                    placeholderTextColor="#C7C7CC"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Price (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    value={editingItem.price.toString()}
                    onChangeText={(text) => {
                      const price = parseFloat(text) || 0;
                      setEditingItem({ ...editingItem, price });
                    }}
                    placeholder="Enter price"
                    placeholderTextColor="#C7C7CC"
                    keyboardType="decimal-pad"
                  />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveMenuItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Menu Item</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
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
  menuItemCategory: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  menuItemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalScroll: {
    padding: 16,
  },
  modalImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  modalImagePlaceholder: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  modalImagePlaceholderText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
});
