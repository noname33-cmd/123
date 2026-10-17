import React from 'react';
import {Text, TextInput} from 'react-native';
import {ActionButton as Button} from '../src/ActionButton';
import renderer, {act, type ReactTestRenderer} from 'react-test-renderer';
import {parseTruckProfile} from '@truck/truck-profile';
import {ProfilePersistence} from '../src/ProfilePersistence';
import {TruckProfileForm} from '../src/TruckProfileForm';
import {JsonTruckProfileStore, type TruckProfileStore, type LoadProfileResult} from '../src/storage/TruckProfileStore';

const profile = parseTruckProfile({schemaVersion: 1, vehicleType: 'tractor-semitrailer', name: 'Synthetic',
  overallHeightMeters: '4.1148', overallWidthMeters: '2.5908', overallLengthMeters: '18.288',
  currentGrossMassKilograms: '36287.3896', totalAxleCount: 5});
if (!profile.ok) {throw new Error('Invalid test fixture');}
const validated = profile.value;

it('restores SI fields and vehicle type, revalidates edits, and deletes only the saved snapshot', async () => {
  let raw: string | null = JSON.stringify({storageVersion: 1, profile: validated});
  const port = {getItem: async () => raw,
    setItem: jest.fn(async (_key: string, value: string) => {raw = value;}),
    removeItem: jest.fn(async () => {raw = null;})};
  let tree!: ReactTestRenderer;
  await act(async () => {tree = renderer.create(<TruckProfileForm store={new JsonTruckProfileStore(port)} />);});
  const button = (title: string) => tree.root.findAllByType(Button).find(node => node.props.title === title)!;
  const press = async (title: string) => {await act(async () => {button(title).props.onPress();});};
  expect(button('Save profile on this device').props.disabled).toBe(true);
  await press('Restore saved profile');
  expect(button('Tractor + one semitrailer').props.accessibilityState.selected).toBe(true);
  expect(tree.root.findAllByType(TextInput)[1]!.props.defaultValue).toBe('4.1148');
  // Restore in the same unit mode must also replace an edited native session.
  await act(async () => {tree.root.findAllByType(TextInput)[1]!.props.onChangeText('9.999');});
  await press('Restore saved profile');
  expect(tree.root.findAllByType(TextInput)[1]!.props.defaultValue).toBe('4.1148');
  expect(tree.root.findAllByType(Text).some(node => node.props.children === 'Saved profile restored in m/kg.')).toBe(true);
  await act(async () => {tree.root.findAllByType(TextInput)[0]!.props.onChangeText('Changed');});
  expect(button('Save profile on this device').props.disabled).toBe(true);
  await press('Validate profile'); await press('Save profile on this device');
  expect(JSON.parse(raw!).profile.name).toBe('Changed');
  await press('Delete saved profile'); expect(raw).toBe(null);
  // A unit round trip remounts native inputs from the retained draft.
  await press('Use ft/lb'); await press('Use m/kg');
  expect(tree.root.findAllByType(TextInput)[0]!.props.defaultValue).toBe('Changed');
  await act(async () => {tree.unmount();});
});

it('serializes requests, locks editing while restoring, and reports storage failures', async () => {
  let resolve!: (result: LoadProfileResult) => void;
  const store: TruckProfileStore = {load: jest.fn(() => new Promise(done => {resolve = done;})),
    save: jest.fn(async () => ({ok: false, code: 'unavailable'} as const)),
    remove: jest.fn(async () => ({ok: false, code: 'unavailable'} as const))};
  let tree!: ReactTestRenderer;
  await act(async () => {tree = renderer.create(<TruckProfileForm store={store} />);});
  const button = (title: string) => tree.root.findAllByType(Button).find(node => node.props.title === title)!;
  await act(async () => {
    button('Restore saved profile').props.onPress(); button('Restore saved profile').props.onPress();
  });
  expect(store.load).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType(TextInput).every(node => node.props.editable === false)).toBe(true);
  await act(async () => {resolve({status: 'unavailable'});});
  expect(tree.root.findAllByType(TextInput).every(node => node.props.editable === true)).toBe(true);
  expect(tree.root.findAllByType(Text).some(node => node.props.children === 'Local storage is unavailable. Try again.')).toBe(true);
  await act(async () => {tree.unmount();});
});

it('does not claim successful writes or erase corrupted data when restore fails', async () => {
  const store: TruckProfileStore = {load: async () => ({status: 'invalid-data'}),
    save: jest.fn(async () => ({ok: false, code: 'unavailable'} as const)), remove: jest.fn(async () => ({ok: true} as const))};
  let tree!: ReactTestRenderer;
  const restore = jest.fn();
  await act(async () => {tree = renderer.create(<ProfilePersistence profile={validated} store={store}
    onRestore={restore} onBusyChange={() => {}} />);});
  const press = async (title: string) => {await act(async () => {
    tree.root.findAllByType(Button).find(node => node.props.title === title)!.props.onPress();
  });};
  await press('Restore saved profile'); expect(restore).not.toHaveBeenCalled(); expect(store.remove).not.toHaveBeenCalled();
  await press('Save profile on this device');
  expect(tree.root.findAllByType(Text).some(node => node.props.children === 'Validated snapshot saved on this device.')).toBe(false);
  await act(async () => {tree.unmount();});
});

it('keeps the saved snapshot unchanged after invalid edits and persists an exact revalidated replacement', async () => {
  const original = JSON.stringify({storageVersion: 1, profile: validated});
  let raw = original;
  const port = {getItem: async () => raw,
    setItem: jest.fn(async (_key: string, value: string) => {raw = value;}),
    removeItem: jest.fn(async () => {})};
  let tree!: ReactTestRenderer;
  await act(async () => {tree = renderer.create(<TruckProfileForm store={new JsonTruckProfileStore(port)} />);});
  const button = (title: string) => tree.root.findAllByType(Button).find(node => node.props.title === title)!;
  const press = async (title: string) => {await act(async () => {button(title).props.onPress();});};
  const editMass = async (text: string) => {await act(async () => {
    tree.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Current gross mass (kg)')!.props.onChangeText(text);
  });};
  await press('Restore saved profile');
  for (const invalid of ['0', '30,000.123456125', '']) {
    await editMass(invalid);
    expect(button('Save profile on this device').props.disabled).toBe(true);
    await press('Save profile on this device');
    await press('Validate profile');
    expect(button('Save profile on this device').props.disabled).toBe(true);
    await press('Save profile on this device');
    expect(port.setItem).not.toHaveBeenCalled();
    expect(raw).toBe(original);
    await press('Restore saved profile');
  }
  await editMass('30000.123456789');
  expect(button('Save profile on this device').props.disabled).toBe(true);
  await press('Validate profile');
  expect(button('Save profile on this device').props.disabled).toBe(false);
  await press('Save profile on this device');
  expect(port.setItem).toHaveBeenCalledTimes(1);
  expect(JSON.parse(raw).profile.currentGrossMassKilograms).toBe('30000.123456789');
  await editMass('1');
  await press('Restore saved profile');
  expect(tree.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Current gross mass (kg)')!.props.defaultValue).toBe('30000.123456789');
  await act(async () => {tree.unmount();});
});
