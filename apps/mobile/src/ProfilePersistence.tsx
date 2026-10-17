import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ActionButton as Button} from './ActionButton';
import {colors} from './theme';
import {type TruckProfile} from '@truck/truck-profile';
import {type TruckProfileStore} from './storage/TruckProfileStore';

interface Props {
  profile?: TruckProfile;
  store: TruckProfileStore;
  onRestore(profile: TruckProfile): void;
  onBusyChange(busy: boolean): void;
}

export function ProfilePersistence({profile, store, onRestore, onBusyChange}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  async function perform(action: 'save' | 'restore' | 'delete') {
    if (pending.current || (action === 'save' && !profile)) {return;}
    pending.current = true; setBusy(true); setMessage(''); onBusyChange(true);
    let text: string;
    try {
      if (action === 'restore') {
        const result = await store.load();
        if (result.status === 'loaded') {
          if (mounted.current) {onRestore(result.profile);}
          text = 'Saved profile restored in m/kg.';
        } else {
          text = result.status === 'empty' ? 'No saved profile on this device.' :
            result.status === 'unsupported-version' ? 'Saved profile version is unsupported. Data was not changed.' :
              result.status === 'invalid-data' ? 'Saved profile is invalid. Data was not changed.' : 'Local storage is unavailable. Try again.';
        }
      } else {
        const result = action === 'save' ? await store.save(profile) : await store.remove();
        text = result.ok ? (action === 'save' ? 'Validated snapshot saved on this device.' : 'Saved profile deleted from this device. Current form is unchanged.') :
          result.code === 'invalid-profile' ? 'Validate the profile before saving.' : 'Local storage is unavailable. Try again.';
      }
    } catch {text = 'Local storage is unavailable. Try again.';}
    finally {
      pending.current = false;
      if (mounted.current) {setBusy(false); onBusyChange(false);}
    }
    if (mounted.current) {setMessage(text);}
  }
  return <View style={styles.section}>
    <Text style={styles.note}>One profile on this device. Saving replaces the previous snapshot. Unsaved drafts remain in memory.</Text>
    <Text style={styles.note}>Restore replaces the m/kg draft with the saved profile. Other unit drafts stay in memory.</Text>
    <Button variant="primary" title="Save profile on this device" disabled={busy || !profile} onPress={() => {void perform('save');}} />
    <Button title="Restore saved profile" disabled={busy} onPress={() => {void perform('restore');}} />
    <Button title="Delete saved profile" disabled={busy} onPress={() => {void perform('delete');}} />
    {message ? <Text style={styles.message} accessibilityRole="alert">{message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: {gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 18, marginTop: 8},
  note: {fontSize: 12, lineHeight: 18, color: colors.muted},
  message: {fontSize: 13, lineHeight: 20, color: colors.ink, backgroundColor: colors.soft, padding: 12, borderRadius: 10},
});
