import React from 'react';
import type { InputHTMLAttributes } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ style, className, ...rest }, ref) => {
    const mergedClassName = `ui-control ${className ?? ''}`.trim();
    return <input ref={ref} className={mergedClassName} {...rest} style={style} />;
  }
);

TextInput.displayName = 'TextInput';
