'use client';

import { MessageSquare } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PromptInput({ 
  value, 
  onChange, 
  disabled = false,
  placeholder = "Describe what happens in this video..."
}: PromptInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="prompt" className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <MessageSquare className="w-4 h-4" />
        Prompt
      </label>
      <textarea
        id="prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={4}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors resize-none"
      />
      <p className="text-xs text-gray-500">
        {value.length} characters
      </p>
    </div>
  );
}

