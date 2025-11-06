'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface StreamingTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  isStreaming?: boolean;
  className?: string;
}

export default function StreamingTextField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  isStreaming = false,
  className = '',
}: StreamingTextFieldProps) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef(value);

  useEffect(() => {
    // If value changed and we're streaming, animate the typing
    if (value !== lastValueRef.current && isStreaming) {
      const newText = value;
      const oldText = lastValueRef.current;
      
      // If new text is longer, we're adding characters
      if (newText.length > oldText.length) {
        const addedText = newText.slice(oldText.length);
        animateTyping(addedText, oldText);
      } else {
        // If new text is shorter or same, just update
        setDisplayText(newText);
        lastValueRef.current = newText;
      }
    } else if (!isStreaming) {
      // If not streaming, just update the display
      setDisplayText(value);
      lastValueRef.current = value;
    }
  }, [value, isStreaming]);

  const animateTyping = (textToAdd: string, currentText: string) => {
    setIsTyping(true);
    let index = 0;
    
    const typeNext = () => {
      if (index < textToAdd.length) {
        const char = textToAdd[index];
        setDisplayText(currentText + textToAdd.slice(0, index + 1));
        index++;
        
        // Type at different speeds for different characters
        const delay = char === ' ' ? 50 : char === '\n' ? 100 : 30;
        typingTimeoutRef.current = setTimeout(typeNext, delay);
      } else {
        setIsTyping(false);
        lastValueRef.current = currentText + textToAdd;
      }
    };
    
    typeNext();
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setDisplayText(newValue);
    lastValueRef.current = newValue;
    onChange(newValue);
  };

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-text-heading mb-2">
        {label}
        {isStreaming && (
          <span className="ml-2 inline-flex items-center gap-1 text-primary-main">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Extracting...</span>
          </span>
        )}
      </label>
      <div className="relative">
        <textarea
          value={displayText}
          onChange={handleChange}
          rows={rows}
          className={`w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary ${
            isTyping ? 'pr-10' : ''
          }`}
          placeholder={placeholder}
        />
        {isTyping && (
          <div className="absolute right-3 top-3">
            <span className="inline-block w-2 h-2 bg-primary-main rounded-full animate-pulse"></span>
          </div>
        )}
      </div>
    </div>
  );
}

