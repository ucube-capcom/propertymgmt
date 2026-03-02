import React from 'react';
import { LayoutGrid, Users, UserSearch, Building2 } from 'lucide-react';
import { Building, Unit } from '../types';
import { UnitGrid } from './UnitGrid';

interface MainContentProps {
  selectedBuilding: Building | null;
  viewMode: 'grid' | 'list';
  units: Unit[];
  handleUnitClick: (unit: Unit) => void;
  selectedUnit?: Unit | null;
}

export function MainContent({
  selectedBuilding,
  viewMode,
  units,
  handleUnitClick,
  selectedUnit
}: MainContentProps) {
  return (
    <div className="flex-1 overflow-auto p-8">
      {selectedBuilding ? (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {viewMode === 'grid' ? <LayoutGrid className="w-6 h-6 text-gray-400" /> : <Users className="w-6 h-6 text-gray-400" />}
              {selectedBuilding.name}동 {viewMode === 'grid' ? '세대 현황판' : '고객 명부'}
            </h3>
            {viewMode === 'grid' && (
              <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
                  <span>미등록</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  <span>계약 관리중</span>
                </div>
              </div>
            )}
          </div>
          
          {viewMode === 'grid' ? (
            <UnitGrid units={units} onUnitClick={handleUnitClick} selectedUnit={selectedUnit} />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">호수</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">고객명</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">거래유형</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">만기일</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {units.map(unit => (
                    <tr key={unit.id} className={`transition-colors ${selectedUnit?.id === unit.id ? 'bg-blue-50 ring-1 ring-inset ring-blue-500' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 font-bold text-gray-900">{unit.unit_number}호</td>
                      <td className="px-6 py-4">
                        {unit.customer_name ? (
                          <span className="font-medium text-gray-900">{unit.customer_name}</span>
                        ) : (
                          <span className="text-gray-300 italic">미등록</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {unit.contract_type ? (
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            unit.contract_type === '매매' ? 'bg-red-100 text-red-600' :
                            unit.contract_type === '전세' ? 'bg-green-100 text-green-600' : 
                            unit.contract_type === '단기' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {unit.contract_type}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {unit.expiration_date || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleUnitClick(unit)}
                          className="text-blue-600 font-bold text-sm hover:underline"
                        >
                          {unit.contract_id ? '상세보기' : '등록하기'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <UserSearch className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">고객 관리 팁</h4>
              <p className="text-sm text-blue-800 opacity-80 leading-relaxed">
                세대 번호를 클릭하여 계약 이력을 확인하거나 새로운 고객을 등록할 수 있습니다.<br />
                등록된 고객은 현황판에서 초록색으로 표시되어 한눈에 파악이 가능합니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center max-w-md">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-blue-200" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">동을 선택해주세요</h3>
            <p className="text-gray-500 leading-relaxed">
              상단 메뉴에서 동을 선택하면<br />해당 동의 세대별 계약 현황을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
