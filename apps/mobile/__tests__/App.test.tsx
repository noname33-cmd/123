import React from 'react';
import {Text} from 'react-native';
import renderer, {act, ReactTestRenderer} from 'react-test-renderer';
import App from '../App';
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

it('shows unavailable navigation without offering a route', async () => {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {tree = renderer.create(<App />);});
  const labels = tree!.root.findAllByType(Text).map(node => node.props.children);
  expect(labels).toContain('Navigation provider is not configured.');
  expect(labels).toContain('Foundation build. Routing and GPS are unavailable.');
  await act(async () => {tree!.unmount();});
});
