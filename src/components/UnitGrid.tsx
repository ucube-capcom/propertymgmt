import React from 'react';
import { Unit } from '../types';

interface UnitGridProps {
  units: Unit[];
  onUnitClick: (unit: Unit) => void;
}

export function UnitGrid({ units, onUnitClick }: UnitGridProps) {
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

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
      <div className="min-w-max">
        {sortedFloors.map((floor) => (
          <div key={floor} className="flex gap-2 mb-2">
            <div className="w-12 flex items-center justify-center text-sm font-medium text-gray-500">
              {floor}F
            </div>
            <div className="flex gap-2">
              {floors[floor]
                .sort((a, b) => a.unit_number.localeCompare(b.unit_number))
                .map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => onUnitClick(unit)}
                  className={`
                    w-24 h-20 rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all
                    ${unit.contract_id 
                      ? 'bg-green-50 border-green-200 hover:border-green-400' 
                      : 'bg-gray-50 border-gray-100 hover:border-gray-300'}
                  `}
                >
                  <span className="text-sm font-bold text-gray-900">{unit.unit_number}</span>
                  {unit.contract_id ? (
                    <div className="mt-1 flex flex-col items-center">
                      <span className="text-xs text-green-700 font-medium">
                        {unit.contract_type === 'sale' ? '매매' : unit.contract_type === 'jeonse' ? '전세' : '월세'}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate max-w-full">
                        {unit.customer_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 mt-1">미등록</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
