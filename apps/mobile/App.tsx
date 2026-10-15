import React, {useEffect, useState} from 'react';
import {ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {UnavailableNavigationEngine} from '@truck/navigation';
import {TruckProfileForm} from './src/TruckProfileForm';
import {localTruckProfileStore} from './src/storage/AsyncStorageProfileStore';

const engine = new UnavailableNavigationEngine();
export default function App() {
  const [message, setMessage] = useState('Checking navigation availability…');
  useEffect(() => {
    let active = true;
    void engine.getAvailability().then(() => {
      if (active) {
        setMessage('Navigation provider is not configured.');
      }
    });
    return () => {active = false;};
  }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View>
          <Text style={styles.title}>Truck Route &amp; Savings</Text>
          <Text>{message}</Text>
          <Text>Foundation build. Routing and GPS are unavailable.</Text>
          <TruckProfileForm store={localTruckProfileStore} />
        </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  screen: {flex: 1, padding: 24, backgroundColor: '#ffffff'},
  title: {fontSize: 24, fontWeight: '600', marginBottom: 16},
});
