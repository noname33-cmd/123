import React from 'react';
import renderer, {act, type ReactTestRenderer} from 'react-test-renderer';
import {ActionButton} from '../src/ActionButton';

it('exposes selected and disabled states to assistive technology', async () => {
  let tree!: ReactTestRenderer;
  const onPress = jest.fn();
  await act(async () => {tree = renderer.create(<ActionButton title="Vehicle" onPress={onPress}
    accessibilityState={{selected: true}} />);});
  const button = () => tree.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityRole === 'button')[0]!;
  expect(button().props.accessibilityRole).toBe('button');
  expect(button().props.accessibilityLabel).toBe('Vehicle');
  expect(button().props.accessibilityState).toEqual({selected: true, disabled: false});
  await act(async () => {tree.root.findByType(ActionButton).props.onPress();});
  expect(onPress).toHaveBeenCalledTimes(1);
  await act(async () => {tree.update(<ActionButton title="Save" disabled onPress={onPress} />);});
  expect(button().props.accessibilityState.disabled).toBe(true);
  await act(async () => {tree.unmount();});
});
