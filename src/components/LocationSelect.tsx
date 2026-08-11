import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, X, ChevronDown, Plus, Check } from 'lucide-react';
import { PREDEFINED_LOCATIONS } from '../config/locations';
import { normalizeLocation } from '../utils/patientUtils';

export interface LocationSelectProps {
  value?: string;
  onChange: (value: string, details?: any) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  id?: string;
  name?: string;
}

export const LocationSelect: React.FC<LocationSelectProps> = ({
  value = '',
  onChange,
  label,
  placeholder = 'Search or enter patient location',
  className = '',
  disabled = false,
  error,
  required = false,
  id,
  name,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal value with external prop
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          commitCurrentInput();
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, inputValue]);

  // Filter matching locations (case-insensitive substring)
  const filteredLocations = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return PREDEFINED_LOCATIONS;
    return PREDEFINED_LOCATIONS.filter((loc) =>
      loc.name.toLowerCase().includes(q)
    );
  }, [inputValue]);

  const trimmedInput = inputValue.trim();
  const normalizedInput = normalizeLocation(trimmedInput);
  const exactMatch = PREDEFINED_LOCATIONS.some(
    (loc) => loc.name.toLowerCase() === trimmedInput.toLowerCase()
  );

  const showManualOption = Boolean(trimmedInput && !exactMatch);
  const totalSelectableItems = filteredLocations.length + (showManualOption ? 1 : 0);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);

  const commitCurrentInput = () => {
    if (normalizedInput) {
      const norm = normalizeLocation(normalizedInput);
      onChange(norm);
    }
  };

  const handleSelectLocation = (locName: string) => {
    const norm = normalizeLocation(locName);
    setInputValue(norm);
    onChange(norm);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % Math.max(1, totalSelectableItems));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) =>
          prev <= 0 ? totalSelectableItems - 1 : prev - 1
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && totalSelectableItems > 0) {
        if (showManualOption && highlightedIndex === 0) {
          handleSelectLocation(normalizedInput);
        } else {
          const adjIdx = showManualOption ? highlightedIndex - 1 : highlightedIndex;
          if (adjIdx >= 0 && adjIdx < filteredLocations.length) {
            handleSelectLocation(filteredLocations[adjIdx].name);
          } else {
            commitCurrentInput();
            setIsOpen(false);
          }
        }
      } else {
        commitCurrentInput();
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const hyderabadGroup = filteredLocations.filter((l) => l.category === 'Hyderabad & Nearby');
  const otherGroup = filteredLocations.filter((l) => l.category === 'Other Common Locations');

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <MapPin size={16} className="absolute left-3 text-slate-400 pointer-events-none z-10" />
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          onChange={(e) => {
            const newVal = e.target.value;
            setInputValue(newVal);
            onChange(newVal);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`w-full pl-9 pr-16 py-2 bg-white border ${
            error ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'
          } rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
            disabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''
          }`}
        />
        <div className="absolute right-2 flex items-center gap-1 z-10">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              title="Clear location"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto py-1 text-sm">
          {/* Manual Entry Option at top if typed text exists and isn't an exact match */}
          {showManualOption && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectLocation(normalizedInput);
              }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 text-teal-700 font-medium border-b border-slate-100 transition-colors ${
                highlightedIndex === 0 ? 'bg-teal-100/70' : 'hover:bg-teal-50'
              }`}
            >
              <Plus size={15} className="shrink-0 text-teal-600" />
              <span className="truncate">
                Add <span className="font-bold">"{normalizedInput}"</span> manually
              </span>
            </button>
          )}

          {/* Group 1: Hyderabad / Nearby */}
          {hyderabadGroup.length > 0 && (
            <div>
              <div className="px-3 py-1 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Hyderabad & Nearby
              </div>
              {hyderabadGroup.map((loc) => {
                const itemIndex = filteredLocations.indexOf(loc);
                const overallIdx = showManualOption ? itemIndex + 1 : itemIndex;
                const isSelected = value.toLowerCase() === loc.name.toLowerCase();
                const isHighlighted = overallIdx === highlightedIndex;

                return (
                  <button
                    key={loc.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectLocation(loc.name);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-slate-700 transition-colors ${
                      isHighlighted ? 'bg-teal-50 text-teal-900 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{loc.name}</span>
                    {isSelected && <Check size={14} className="text-teal-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Group 2: Other Common Locations */}
          {otherGroup.length > 0 && (
            <div>
              <div className="px-3 py-1 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-t border-slate-100">
                Other Common Locations
              </div>
              {otherGroup.map((loc) => {
                const itemIndex = filteredLocations.indexOf(loc);
                const overallIdx = showManualOption ? itemIndex + 1 : itemIndex;
                const isSelected = value.toLowerCase() === loc.name.toLowerCase();
                const isHighlighted = overallIdx === highlightedIndex;

                return (
                  <button
                    key={loc.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectLocation(loc.name);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-slate-700 transition-colors ${
                      isHighlighted ? 'bg-teal-50 text-teal-900 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{loc.name}</span>
                    {isSelected && <Check size={14} className="text-teal-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state if no predefined matches and no manual option */}
          {filteredLocations.length === 0 && !showManualOption && (
            <div className="px-3 py-3 text-center text-slate-400 text-xs">
              No matching locations found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSelect;
