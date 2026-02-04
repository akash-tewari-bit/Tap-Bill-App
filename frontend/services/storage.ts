import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string; // base64
  category: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  tableToken: string;
  notes: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMode: 'Cash' | 'UPI';
  timestamp: string;
}

export interface Settings {
  businessName: string;
  businessLogo: string; // base64
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
}

const ORDERS_KEY = '@food_cart_orders';
const MENU_ITEMS_KEY = '@food_cart_menu_items';
const SETTINGS_KEY = '@food_cart_settings';

// Orders
export const saveOrder = async (order: Order): Promise<void> => {
  try {
    const orders = await getOrders();
    orders.push(order);
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('Error saving order:', error);
    throw error;
  }
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    const ordersJson = await AsyncStorage.getItem(ORDERS_KEY);
    return ordersJson ? JSON.parse(ordersJson) : [];
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
};

export const getOrdersByDateRange = async (startDate: Date, endDate: Date): Promise<Order[]> => {
  try {
    const orders = await getOrders();
    return orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      return orderDate >= startDate && orderDate <= endDate;
    });
  } catch (error) {
    console.error('Error filtering orders:', error);
    return [];
  }
};

export const getTodayOrders = async (): Promise<Order[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return await getOrdersByDateRange(today, tomorrow);
  } catch (error) {
    console.error('Error getting today orders:', error);
    return [];
  }
};

// Menu Items
export const saveMenuItem = async (menuItem: MenuItem): Promise<void> => {
  try {
    const menuItems = await getMenuItems();
    const existingIndex = menuItems.findIndex(item => item.id === menuItem.id);
    
    if (existingIndex >= 0) {
      menuItems[existingIndex] = menuItem;
    } else {
      menuItems.push(menuItem);
    }
    
    await AsyncStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(menuItems));
  } catch (error) {
    console.error('Error saving menu item:', error);
    throw error;
  }
};

export const getMenuItems = async (): Promise<MenuItem[]> => {
  try {
    const menuItemsJson = await AsyncStorage.getItem(MENU_ITEMS_KEY);
    return menuItemsJson ? JSON.parse(menuItemsJson) : [];
  } catch (error) {
    console.error('Error getting menu items:', error);
    return [];
  }
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  try {
    const menuItems = await getMenuItems();
    const filteredItems = menuItems.filter(item => item.id !== id);
    await AsyncStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(filteredItems));
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw error;
  }
};

// Settings
export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const getSettings = async (): Promise<Settings | null> => {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    return settingsJson ? JSON.parse(settingsJson) : null;
  } catch (error) {
    console.error('Error getting settings:', error);
    return null;
  }
};

// Initialize with sample data
export const initializeSampleData = async (): Promise<void> => {
  try {
    const settings = await getSettings();
    const menuItems = await getMenuItems();
    
    // Initialize settings if not exists
    if (!settings) {
      const defaultSettings: Settings = {
        businessName: 'My Food Cart',
        businessLogo: '',
        address: '123 Street, City',
        phone: '+1234567890',
        email: 'info@foodcart.com',
        gstNumber: 'GST123456',
      };
      await saveSettings(defaultSettings);
    }
    
    // Initialize sample menu items if not exists
    if (menuItems.length === 0) {
      const sampleItems: MenuItem[] = [
        {
          id: '1',
          name: 'Burger',
          price: 150,
          image: '',
          category: 'Snacks',
        },
        {
          id: '2',
          name: 'Pizza',
          price: 250,
          image: '',
          category: 'Snacks',
        },
        {
          id: '3',
          name: 'Coffee',
          price: 50,
          image: '',
          category: 'Beverages',
        },
        {
          id: '4',
          name: 'Tea',
          price: 30,
          image: '',
          category: 'Beverages',
        },
      ];
      
      for (const item of sampleItems) {
        await saveMenuItem(item);
      }
    }
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
};
