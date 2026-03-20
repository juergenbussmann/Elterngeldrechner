import React from 'react';
import type { TextareaHTMLAttributes } from 'react';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ style, className, rows = 4, ...rest }, ref) => {
    const mergedClassName = `ui-control ${className ?? ''}`.trim();
    return (
      <textarea ref={ref} rows={rows} className={mergedClassName} {...rest} style={style} />
    );
  }
);

TextArea.displayName = 'TextArea';
