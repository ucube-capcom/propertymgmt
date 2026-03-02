import React, { useEffect, useRef } from 'react';
import { Unit } from '../types';

interface UnitGridProps {
  units: Unit[];
  onUnitClick: (unit: Unit) => void;
  selectedUnit?: Unit | null;
}

export function UnitGrid({ units, onUnitClick, selectedUnit }: UnitGridProps) {
  const selectedUnitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedUnit && selectedUnitRef.current) {
      selectedUnitRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [selectedUnit]);

  // Extract line number (호 라인) from unit number
  const getLineNumber = (unitNumber: string, floor: number) => {
    const cleanUnit = unitNumber.replace(/[제호\s]/g, '');
    const floorStr = Math.abs(floor).toString();
    let line = cleanUnit.replace(new RegExp(`^(B|-)?0*${floorStr}`), '');
    if (!line) line = cleanUnit;
    return line;
  };

  // Group units by floor
  const floors = units.reduce((acc, unit) => {
    if (!acc[unit.floor]) {
      acc[unit.floor] = [];
    }
    acc[unit.floor].push(unit);
    return acc;
  }, {} as Record<number, Unit[]>);

  // Sort floors descending
  const sortedFloors = Object.keys(floors)
    .map(Number)
    .sort((a, b) => b - a);

  // Get all unique lines across all floors to create columns
  const allLines = Array.from(
    new Set(units.map(unit => getLineNumber(unit.unit_number, unit.floor)))
  ).sort((a, b) => {
    // Try to sort numerically if possible, otherwise alphabetically
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA === numB) return a.localeCompare(b); // for cases like 01A, 01B
      return numA - numB;
    }
    return a.localeCompare(b);
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
      <div className="min-w-max">
        {sortedFloors.map((floor) => (
          <div key={floor} className="flex gap-2 mb-2">
            <div className="w-12 flex items-center justify-center text-sm font-medium text-gray-500 shrink-0">
              {floor}F
            </div>
            <div className="flex gap-2">
              {allLines.map((line) => {
                const unit = floors[floor].find(
                  (u) => getLineNumber(u.unit_number, u.floor) === line
                );

                if (unit && unit.status !== '빈공간') {
                  return (
                    <button
                      key={unit.id}
                      ref={selectedUnit?.id === unit.id ? selectedUnitRef : null}
                      onClick={() => onUnitClick(unit)}
                      className={`
                        w-24 h-20 rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all shrink-0
                        ${selectedUnit?.id === unit.id ? 'ring-4 ring-blue-500 ring-offset-2 z-10 scale-105' : ''}
                        ${unit.contract_id 
                          ? 'bg-green-50 border-green-200 hover:border-green-400' 
                          : 'bg-gray-50 border-gray-100 hover:border-gray-300'}
                      `}
                    >
                      <span className="text-sm font-bold text-gray-900">{unit.unit_number}</span>
                      {unit.contract_id ? (
                        <div className="mt-1 flex flex-col items-center">
                          <span className="text-xs text-green-700 font-medium">
                            {unit.contract_type}
                          </span>
                          <span className="text-[10px] text-gray-500 truncate max-w-full">
                            {unit.customer_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 mt-1">미등록</span>
                      )}
                    </button>
                  );
                } else if (unit && unit.status === '빈공간') {
                  return (
                    <button 
                      key={unit.id} 
                      onClick={() => onUnitClick(unit)}
                      className={`
                        w-24 h-20 rounded-lg border-2 border-gray-200 bg-gray-50 flex items-center justify-center relative overflow-hidden shrink-0 hover:border-gray-300 transition-colors
                        ${selectedUnit?.id === unit.id ? 'ring-4 ring-blue-500 ring-offset-2 z-10 scale-105' : ''}
                      `}
                      title={`${unit.unit_number} (빈공간)`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg className="w-full h-full text-gray-300" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1" />
                          <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" />
                        </svg>
                      </div>
                    </button>
                  );
                } else {
                  return (
                    <div 
                      key={`empty-${floor}-${line}`} 
                      className="w-24 h-20 rounded-lg border-2 border-gray-200 bg-gray-50 flex items-center justify-center relative overflow-hidden shrink-0"
                    >
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg className="w-full h-full text-gray-300" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1" />
                          <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" />
                        </svg>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
