import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {UnavailableNavigationEngine} from '@truck/navigation';
import {TruckProfileForm} from './src/TruckProfileForm';
import {colors} from './src/theme';
import {localTruckProfileStore} from './src/storage/AsyncStorageProfileStore';

const engine = new UnavailableNavigationEngine();
export default function App() {
  const scroll = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
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
        <ScrollView ref={scroll} onScroll={event => {scrollOffset.current = event.nativeEvent.contentOffset.y;}} scrollEventThrottle={16} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <Text style={styles.title}>Truck Route &amp; Savings</Text>
          <Text style={styles.notice}>{message}</Text>
          <Text style={styles.notice}>Foundation build. Routing and GPS are unavailable.</Text>
        </View>
        <TruckProfileForm store={localTruckProfileStore} onInputFocus={inputY => {
          scroll.current?.getNativeScrollRef()?.measureInWindow((_x, scrollY) => {
            scroll.current?.scrollTo({y: Math.max(0, scrollOffset.current + inputY - scrollY - 16), animated: false});
          });
        }} />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.surface},
  content: {padding: 20, paddingBottom: 40, gap: 20},
  header: {gap: 8},
  title: {fontSize: 22, fontWeight: '700', color: colors.ink},
  notice: {fontSize: 12, lineHeight: 18, color: colors.muted},
});
