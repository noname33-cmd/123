import React from 'react';
import {requireNativeComponent, StyleSheet, type NativeSyntheticEvent, type ViewProps} from 'react-native';
import type {ProfileInputProps} from './ProfileInput';

type NativeProps = ViewProps & {
  initialText: string;
  editingEnabled: boolean;
  inputKind: 'text' | 'integer' | 'decimal';
  inputLabel: string;
  onTextChange: (event: NativeSyntheticEvent<{text: string}>) => void;
};
const NativeInput = requireNativeComponent<NativeProps>('TRSProfileInput');

export function ProfileInput(props: ProfileInputProps) {
  return <NativeInput initialText={props.defaultValue ?? ''} editingEnabled={props.editable !== false}
    inputLabel={props.accessibilityLabel ?? ''}
    inputKind={props.keyboardType === 'number-pad' ? 'integer' : props.keyboardType === 'decimal-pad' ? 'decimal' : 'text'}
    style={[props.style, styles.input]}
    onTextChange={event => props.onChangeText?.(event.nativeEvent.text)} />;
}

const styles = StyleSheet.create({input: {height: 48}});
