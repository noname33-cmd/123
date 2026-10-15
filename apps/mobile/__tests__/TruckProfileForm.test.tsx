import React from 'react';
import {Button, Text, TextInput} from 'react-native';
import renderer, {act, type ReactTestRenderer} from 'react-test-renderer';
import {TruckProfileForm} from '../src/TruckProfileForm';

for (const type of ['Rigid truck — no trailer', 'Tractor + one semitrailer']) {
  it(`validates compound lengths for ${type}, preserving components and rejecting incomplete input`, async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {tree = renderer.create(<TruckProfileForm />);});
    const press = async (title: string) => {
      await act(async () => {tree.root.findAllByType(Button).find(node => node.props.title === title)!.props.onPress();});
    };
    const edit = async (label: string, value: string) => {
      await act(async () => {tree.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!.props.onChangeText(value);});
    };
    const labels = () => tree.root.findAllByType(Text).map(node => node.props.children);
    const expected = 'Validated SI: height 4.1148 m; width 2.5908 m; length 18.288 m; mass 36287.3896 kg.';
    await press(type); await press('Use ft+in/lb');
    for (const [label, value] of [
      ['Profile name', 'Synthetic'], ['Overall height (ft)', '13'], ['Overall height (in)', '6'],
      ['Overall width (ft)', '8'], ['Overall width (in)', '6'],
      ['Overall length (ft)', '60'], ['Overall length (in)', '0'],
      ['Current gross mass (lb)', '80000'], ['Total physical axles', '5'],
    ]) {await edit(label!, value!);}
    await press('Validate profile'); expect(labels()).toContain(expected);
    await press('Use m/kg'); expect(labels()).not.toContain(expected);
    await press('Use ft+in/lb');
    expect(tree.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Overall height (in)')!.props.value).toBe('6');
    for (const invalid of ['', '12', '-1', '6,5']) {
      await edit('Overall height (in)', invalid);
      await press('Validate profile');
      expect(labels()).not.toContain(expected);
      expect(labels()).toContain('Enter whole feet and inches from 0 to below 12; total must be positive.');
    }
    await edit('Overall height (in)', '6'); await press('Validate profile');
    expect(labels()).toContain(expected);
    await edit('Overall height (ft)', '13.5'); await press('Validate profile');
    expect(labels()).not.toContain(expected);
    await act(async () => {tree.unmount();});
  });
}

for (const type of ['Rigid truck — no trailer', 'Tractor + one semitrailer']) {
  it(`validates ${type} and clears success after edits`, async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {tree = renderer.create(<TruckProfileForm />);});
    const press = async (title: string) => {
      await act(async () => {tree.root.findAllByType(Button).find(node => node.props.title === title)!.props.onPress();});
    };
    await press('Validate profile');
    expect(tree.root.findAllByType(Text).some(node => node.props.children === 'Choose a vehicle type.')).toBe(true);
    await press(type);
    const inputs = tree.root.findAllByType(TextInput);
    for (const [index, value] of ['Test vehicle', '4.1', '2.5', '20', '30000.123456789', '5'].entries()) {
      await act(async () => {inputs[index]!.props.onChangeText(value);});
    }
    await press('Validate profile');
    const success = () => tree.root.findAllByType(Text).some(node =>
      node.props.children === 'Profile format is valid. Road legality is not verified.');
    expect(success()).toBe(true);
    await act(async () => {inputs[1]!.props.onChangeText('4,1');});
    expect(success()).toBe(false);
    await press('Validate profile');
    expect(success()).toBe(false);
    expect(tree.root.findAllByType(Text).some(node => node.props.children === 'Enter a positive decimal using a dot.')).toBe(true);
    await act(async () => {tree.unmount();});
  });
}

for (const type of ['Rigid truck — no trailer', 'Tractor + one semitrailer']) {
  for (const [mode, dimensions] of [
    ['ft/lb', ['13.5', '8.5', '60']], ['in/lb', ['162', '102', '720']],
  ] as const) {
    it(`converts ${mode} for ${type}, preserves drafts and rejects mixed syntax`, async () => {
      let tree!: ReactTestRenderer;
      await act(async () => {tree = renderer.create(<TruckProfileForm />);});
      const press = async (title: string) => {
        await act(async () => {tree.root.findAllByType(Button).find(node => node.props.title === title)!.props.onPress();});
      };
      const edit = async (index: number, value: string) => {
        await act(async () => {tree.root.findAllByType(TextInput)[index]!.props.onChangeText(value);});
      };
      const labels = () => tree.root.findAllByType(Text).map(node => node.props.children);
      await press(type);
      await press(`Use ${mode}`);
      for (const [index, value] of ['Synthetic', ...dimensions, '80000', '5'].entries()) {
        await edit(index, value);
      }
      await press('Validate profile');
      const expected = 'Validated SI: height 4.1148 m; width 2.5908 m; length 18.288 m; mass 36287.3896 kg.';
      expect(labels()).toContain(expected);
      await press('Use m/kg');
      expect(labels()).not.toContain(expected);
      expect(tree.root.findAllByType(TextInput)[1]!.props.value).toBe('');
      await press(`Use ${mode}`);
      expect(tree.root.findAllByType(TextInput)[1]!.props.value).toBe(dimensions[0]);
      await edit(1, '13 ft 6 in');
      await press('Validate profile');
      expect(labels()).not.toContain(expected);
      expect(labels()).toContain('Enter a positive decimal using a dot.');
      await edit(1, dimensions[0]);
      await edit(4, '80,000');
      await press('Validate profile');
      expect(labels()).not.toContain(expected);
      await act(async () => {tree.unmount();});
    });
  }
}
