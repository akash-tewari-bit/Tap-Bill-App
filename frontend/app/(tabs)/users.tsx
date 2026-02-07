import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';
import axios from 'axios';
import { router } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

interface User {
  phoneNumber: string;
  name: string;
  isActive: boolean;
}

export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  
  // Redirect if not super admin
  useEffect(() => {
    if (!currentUser?.isSuperAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this screen.');
      router.replace('/(tabs)');
    }
  }, [currentUser]);

  // If not super admin, show nothing
  if (!currentUser?.isSuperAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Access Denied</Text>
        </View>
      </View>
    );
  }

  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editActive, setEditActive] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await axios.get(`${BACKEND_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      setUsers(response.data.users);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query) {
      loadUsers();
      return;
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await axios.get(
        `${BACKEND_URL}/api/admin/users/search`,
        {
          params: { query },
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
      setUsers(response.data.users);
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditActive(user.isActive);
    setEditModalVisible(true);
  };

  const saveChanges = async () => {
    if (!selectedUser) return;

    try {
      const idToken = await auth.currentUser?.getIdToken();
      await axios.put(
        `${BACKEND_URL}/api/admin/users/${selectedUser.phoneNumber}`,
        {
          name: editName,
          isActive: editActive,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      Alert.alert('Success', 'User updated successfully');
      setEditModalVisible(false);
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update user');
      console.error(error);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.mobileNumber}>{item.phoneNumber}</Text>
        <Text style={styles.userName}>{item.name || 'No name'}</Text>
      </View>
      <View style={styles.userActions}>
        <View
          style={[
            styles.statusBadge,
            item.isActive ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by mobile number"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchUsers(text);
          }}
          keyboardType="phone-pad"
          placeholderTextColor="#C7C7CC"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.phoneNumber}
          refreshing={loading}
          onRefresh={loadUsers}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}

      {/* Edit User Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Mobile Number</Text>
              <Text style={styles.mobileDisplay}>
                {selectedUser?.phoneNumber}
              </Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter name"
                placeholderTextColor="#C7C7CC"
              />

              <View style={styles.switchContainer}>
                <Text style={styles.label}>Active Status</Text>
                <Switch
                  value={editActive}
                  onValueChange={setEditActive}
                  trackColor={{ false: '#C7C7CC', true: '#34C759' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  mobileNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: '#8E8E93',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#34C759',
  },
  inactiveBadge: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
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
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    marginTop: 16,
  },
  mobileDisplay: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
