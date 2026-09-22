import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ChartsScreen from '../screens/ChartsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import YearlyScreen from '../screens/YearlyScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Transactions: 'list',
            Charts: 'pie-chart',
            Categories: 'pricetag',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Charts" component={ChartsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen name="Yearly" component={YearlyScreen} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8FF' },
});
