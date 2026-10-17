import React from 'react';
import renderer, {act, type ReactTestRenderer} from 'react-test-renderer';
import {ProfileInput} from '../src/ProfileInput.ios';

jest.mock('react-native/Libraries/ReactNative/requireNativeComponent', () => ({default: () => 'TRSProfileInput'}));

it('maps the iOS input contract and forwards exact native text without parsing or rewriting', async () => {
  const changed = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => {tree = renderer.create(<ProfileInput accessibilityLabel="Mass"
    defaultValue="36287.3896" editable={false} keyboardType="decimal-pad" onChangeText={changed} />);});
  const native = tree.root.findByType('TRSProfileInput' as never);
  expect(native.props.initialText).toBe('36287.3896');
  expect(native.props.inputLabel).toBe('Mass');
  expect(native.props.inputKind).toBe('decimal');
  expect(native.props.editingEnabled).toBe(false);
  for (const text of ['4.', '4.1148', '', '4,1', '30000.123456789']) {
    await act(async () => {native.props.onTextChange({nativeEvent: {text}});});
    expect(changed).toHaveBeenLastCalledWith(text);
  }
  await act(async () => {tree.update(<ProfileInput keyboardType="number-pad" />);});
  expect(native.props.inputKind).toBe('integer');
  expect(native.props.editingEnabled).toBe(true);
  await act(async () => {tree.unmount();});
});
