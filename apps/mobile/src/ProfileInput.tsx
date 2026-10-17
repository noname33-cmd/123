import React from 'react';
import {TextInput, type TextInputProps} from 'react-native';

export type ProfileInputProps = Pick<TextInputProps,
  'accessibilityLabel' | 'defaultValue' | 'editable' | 'keyboardType' | 'style' | 'onChangeText'>;

export function ProfileInput(props: ProfileInputProps) {
  return <TextInput {...props} />;
}
