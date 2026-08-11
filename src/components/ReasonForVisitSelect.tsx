import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { DENTAL_PROBLEMS } from '../config/dentalProblems';

interface ReasonForVisitSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export const ReasonForVisitSelect: React.FC<ReasonForVisitSelectProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  id,
  placeholder = 'Select problem / reason for visit',
  disabled = false,
  label = 'Reason for Visit / Treatment'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse standard vs custom reason from passed value
  const parseValue = (val: string) => {
    if (!val) return { isOther: false, standard: '', custom: '' };
    const exactMatch = DENTAL_PROBLEMS.find(p => p.toLowerCase() === val.toLowerCase());
    if (exactMatch) {
      return { isOther: exactMatch === 'Other', standard: exactMatch, custom: '' };
    }
    if (val.toLowerCase().startsWith('other:') || val.toLowerCase().startsWith('other -') || val.toLowerCase().startsWith('other (')) {
      const customPart = val.replace(/^other[:\s\-\(]*/i, '').replace(/\)$/, '').trim();
      return { isOther: true, standard: 'Other', custom: customPart };
    }
    // Any non-standard string is treated as Other with custom text
    return { isOther: true, standard: 'Other', custom: val };
  };

  const parsed = parseValue(value);
  const isOtherSelected = parsed.standard === 'Other';
  const [customReason, setCustomReason] = useState(parsed.custom);

  useEffect(() => {
    setCustomReason(parseValue(value).custom);
  }, [value]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = DENTAL_PROBLEMS.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleSelectOption = (opt: string) => {
    setIsOpen(false);
    setSearchTerm('');
    if (opt === 'Other') {
      const finalVal = customReason.trim() ? `Other: ${customReason.trim()}` : 'Other';
      onChange(finalVal);
    } else {
      onChange(opt);
    }
  };

  const handleCustomReasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomReason(text);
    const finalVal = text.trim() ? `Other: ${text.trim()}` : 'Other';
    onChange(finalVal);
  };

  const displayTriggerText = parsed.standard
    ? (parsed.standard === 'Other' && parsed.custom ? `Other: ${parsed.custom}` : parsed.standard)
    : '';

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Hidden input for HTML5 required form validation */}
      <input
        type="text"
        tabIndex={-1}
        required={required}
        value={value || ''}
        onChange={() => {}}
        className="sr-only"
        aria-hidden="true"
      />

      <div className="relative">
        {/* Trigger Button / Display */}
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(prev => !prev);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all bg-white ${
            isOpen ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''}`}
        >
          <span className={`truncate pr-2 ${!displayTriggerText ? 'text-slate-400' : 'text-slate-800'}`}>
            {displayTriggerText || placeholder}
          </span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Popup */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 py-2 left-0 top-full text-xs">
            {/* Search Input Box */}
            <div className="px-2 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Search size={14} className="text-slate-400 shrink-0 ml-1" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Type to search (e.g., RCT, Pain, Crown, Fill)..."
                className="w-full text-xs font-medium bg-transparent border-none outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400 py-1"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 hover:bg-slate-100 rounded-md text-slate-400"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto custom-scrollbar py-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => {
                  const isSelected = parsed.standard === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-teal-50 text-teal-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700 font-medium'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check size={14} className="text-teal-600 shrink-0 ml-2" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-center text-slate-400 text-xs">
                  No matching reason found.
                  <button
                    type="button"
                    onClick={() => handleSelectOption('Other')}
                    className="block mx-auto mt-1 font-semibold text-teal-600 hover:underline"
                  >
                    Select "Other" to specify custom reason
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* If "Other" is selected, render "Please specify" custom text input */}
      {isOtherSelected && (
        <div className="pt-1.5 space-y-1">
          <label className="block text-[10px] font-bold uppercase text-amber-700 tracking-wider">
            Please specify custom reason <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required={required}
            value={customReason}
            onChange={handleCustomReasonChange}
            placeholder="Enter custom reason for visit..."
            className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-medium bg-amber-50/30 text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      )}
    </div>
  );
};

export default ReasonForVisitSelect;
