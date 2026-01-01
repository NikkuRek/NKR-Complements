'use client';

import { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
    id: string;
    value?: string; // ISO format YYYY-MM-DD
    onChange?: (isoDate: string) => void;
    placeholder?: string;
    className?: string;
}

export default function DatePicker({
    id,
    value = '',
    onChange,
    placeholder = 'DD / MM / AAAA',
    className = '',
}: DatePickerProps) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
    const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
    const [isOpen, setIsOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Initialize from value prop
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
                setSelectedDate(adjustedDate);
                setDisplayValue(formatDisplayDate(adjustedDate));
            }
        } else {
            setSelectedDate(null);
            setDisplayValue('');
        }
    }, [value]);

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const formatDisplayDate = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatISODate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isSameDay = (d1: Date | null, d2: Date | null): boolean => {
        return !!(d1 && d2 &&
            d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear());
    };

    const handlePrevMonth = () => {
        setDisplayMonth(prev => {
            if (prev === 0) {
                setDisplayYear(y => y - 1);
                return 11;
            }
            return prev - 1;
        });
    };

    const handleNextMonth = () => {
        setDisplayMonth(prev => {
            if (prev === 11) {
                setDisplayYear(y => y + 1);
                return 0;
            }
            return prev + 1;
        });
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(displayYear, displayMonth, day);
        setSelectedDate(newDate);
        setDisplayValue(formatDisplayDate(newDate));

        if (onChange) {
            onChange(formatISODate(newDate));
        }

        setTimeout(() => setIsOpen(false), 150);
    };

    const handleInputClick = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            if (selectedDate) {
                setDisplayMonth(selectedDate.getMonth());
                setDisplayYear(selectedDate.getFullYear());
            } else {
                const today = new Date();
                setDisplayMonth(today.getMonth());
                setDisplayYear(today.getFullYear());
            }
        }
    };

    const renderCalendar = () => {
        const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay();
        const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(displayYear, displayMonth, 0).getDate();
        const days: React.JSX.Element[] = [];
        const today = new Date();

        // Previous month days
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(
                <div
                    key={`prev-${i}`}
                    className="h-7 w-7 flex items-center justify-center text-slate-700 text-xs pointer-events-none"
                >
                    {daysInPrevMonth - firstDayOfMonth + 1 + i}
                </div>
            );
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateToCheck = new Date(displayYear, displayMonth, day);
            const isToday = isSameDay(dateToCheck, today);
            const isSelected = isSameDay(dateToCheck, selectedDate);

            let buttonClass = 'h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 hover:bg-slate-800 hover:text-blue-400 focus:outline-none';

            if (isSelected) {
                buttonClass += ' bg-blue-600 text-white shadow-md hover:bg-blue-500 hover:text-white transform scale-105';
            } else if (isToday) {
                buttonClass += ' text-blue-400 border border-blue-500/50 font-bold bg-blue-900/20';
            } else {
                buttonClass += ' text-slate-300';
            }

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={buttonClass}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`} id={`date-picker-component-${id}`}>
            <div className="relative group">
                <input
                    type="text"
                    id={id}
                    readOnly
                    value={displayValue}
                    onClick={handleInputClick}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer transition-all hover:bg-slate-900 font-medium text-slate-200 placeholder-slate-600 text-sm"
                />
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors">
                    <i className="fas fa-calendar text-base"></i>
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-3 animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                        >
                            <i className="fas fa-chevron-left text-base"></i>
                        </button>
                        <div className="font-semibold text-slate-100 text-sm">
                            {monthNames[displayMonth]} {displayYear}
                        </div>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                        >
                            <i className="fas fa-chevron-right text-base"></i>
                        </button>
                    </div>

                    {/* Weekday labels */}
                    <div className="grid grid-cols-7 mb-2 text-center">
                        <div className="text-xs font-semibold text-slate-500">Do</div>
                        <div className="text-xs font-semibold text-slate-500">Lu</div>
                        <div className="text-xs font-semibold text-slate-500">Ma</div>
                        <div className="text-xs font-semibold text-slate-500">Mi</div>
                        <div className="text-xs font-semibold text-slate-500">Ju</div>
                        <div className="text-xs font-semibold text-slate-500">Vi</div>
                        <div className="text-xs font-semibold text-slate-500">Sa</div>
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                    </div>
                </div>
            )}
        </div>
    );
}
