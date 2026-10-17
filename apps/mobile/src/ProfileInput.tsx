import React, {useRef} from 'react';
import {TextInput, type TextInputProps} from 'react-native';

export type ProfileInputProps = Pick<TextInputProps,
  'accessibilityLabel' | 'defaultValue' | 'editable' | 'keyboardType' | 'style' | 'onChangeText'> & {onInputFocus?: (windowY: number) => void};

export function ProfileInput({onInputFocus, ...props}: ProfileInputProps) {
  const input = useRef<TextInput>(null);
  return <TextInput {...props} ref={input} onFocus={() => {
    input.current?.measureInWindow((_x, y) => onInputFocus?.(y));
  }} />;
}
