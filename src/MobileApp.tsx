import React, { useState, useEffect } from 'react';
import { Search, Building2, Home, ChevronRight, MapPin, Clock, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRealEstateData } from './hooks/useRealEstateData';
import { UnitDetailModal } from './components/UnitDetailModal';
import { Complex, Building, Unit } from './types';
import { supabase } from './lib/supabase';

export function MobileApp() {
  const {
    complexes,
    selectedComplex,
    setSelectedComplex,
    buildings,
    setBuildings,
    selectedBuilding,
    setSelectedBuilding,
    units,
    selectedUnit,
    isUnitModalOpen,
    setIsUnitModalOpen,
    customerSearch,
    setCustomerSearch,
    searchResults,
    setSearchResults,
    recentContracts,
    fetchComplexes,
    fetchBuildings,
    fetchUnits,
    handleUnitClick,
    handleSearch,
    handleSearchResultClick
  } = useRealEstateData();

  const [activeTab, setActiveTab] = useState<'complexes' | 'recent' | 'search'>('complexes');

  // Group complexes by district
  const complexesByDistrict = complexes.reduce((acc, complex) => {
    const district = complex.district || '기타';
    if (!acc[district]) acc[district] = [];
    acc[district].push(complex);
    return acc;
  }, {} as Record<string, Complex[]>);

  const handleComplexSelect = (complex: Complex) => {
    setSelectedComplex(complex);
    setActiveTab('buildings');
  };

  const handleBuildingSelect = (building: Building) => {
    setSelectedBuilding(building);
    setActiveTab('units');
  };

  const handleBack = () => {
    if (activeTab === 'units') setActiveTab('buildings');
    else if (activeTab === 'buildings') setActiveTab('complexes');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-indigo-600 text-white p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeTab === 'buildings' || activeTab === 'units' ? (
            <button onClick={handleBack} className="p-1 -ml-1 hover:bg-indigo-700 rounded-full">
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
          ) : (
            <Building2 className="w-6 h-6" />
          )}
          <h1 className="text-lg font-bold">
            {activeTab === 'units' ? selectedBuilding?.name :
             activeTab === 'buildings' ? selectedComplex?.name :
             '계약 관리 모바일'}
          </h1>
        </div>
        <Link to="/" className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-full text-white transition-colors" title="데스크톱 버전">
          <Monitor className="w-5 h-5" />
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'complexes' && (
          <div className="space-y-6">
            <form onSubmit={(e) => handleSearch(e)} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="고객명, 연락처, 호실 검색..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </form>

            {customerSearch ? (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">검색 결과</h2>
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => handleSearchResultClick(result)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium text-indigo-600">{result.customer_name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {result.complex_name} {result.building_name} {result.unit_name}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">검색 결과가 없습니다.</div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> 단지 목록
                  </h2>
                  {(Object.entries(complexesByDistrict) as [string, Complex[]][]).map(([district, districtComplexes]) => (
                    <div key={district} className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-400 ml-1">{district}</h3>
                      {districtComplexes.map(complex => (
                        <div
                          key={complex.id}
                          onClick={() => handleComplexSelect(complex)}
                          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50"
                        >
                          <div>
                            <div className="font-medium">{complex.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {complex.building_count}개동 · {complex.unit_count}세대
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {recentContracts.length > 0 && (
                  <div className="space-y-3 mt-8">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4" /> 최근 계약
                    </h2>
                    {recentContracts.map((contract) => (
                      <div
                        key={contract.id}
                        onClick={() => handleSearchResultClick(contract)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{contract.customer_name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {contract.complex_name} {contract.building_name} {contract.unit_name}
                          </div>
                        </div>
                        <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                          {contract.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'buildings' && (
          <div className="space-y-3">
            {buildings.map(building => (
              <div
                key={building.id}
                onClick={() => handleBuildingSelect(building)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold">
                    {building.name.replace(/[^0-9]/g, '') || building.name.charAt(0)}
                  </div>
                  <div className="font-medium">{building.name}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))}
            {buildings.length === 0 && (
              <div className="text-center py-8 text-gray-500">등록된 동이 없습니다.</div>
            )}
          </div>
        )}

        {activeTab === 'units' && (
          <div className="grid grid-cols-2 gap-3">
            {units.filter(u => u.status !== '빈공간').map(unit => {
              const statusColors = {
                '분양가능': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                '청약': 'bg-blue-50 text-blue-700 border-blue-200',
                '계약': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                '입주': 'bg-purple-50 text-purple-700 border-purple-200',
                '보류': 'bg-amber-50 text-amber-700 border-amber-200',
                '빈공간': 'bg-gray-50 text-gray-400 border-gray-200',
              };
              const colorClass = statusColors[unit.status as keyof typeof statusColors] || 'bg-gray-50 text-gray-700 border-gray-200';

              return (
                <div
                  key={unit.id}
                  onClick={() => handleUnitClick(unit)}
                  className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center gap-2 active:opacity-70 ${colorClass}`}
                >
                  <div className="font-bold text-lg">{unit.name}</div>
                  <div className="text-xs font-medium px-2 py-1 rounded-full bg-white/50">
                    {unit.status}
                  </div>
                </div>
              );
            })}
            {units.filter(u => u.status !== '빈공간').length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-500">등록된 호실이 없습니다.</div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 flex justify-around p-3 pb-safe">
        <button
          onClick={() => { setActiveTab('complexes'); setCustomerSearch(''); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'complexes' && !customerSearch ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">홈</span>
        </button>
        <button
          onClick={() => { setActiveTab('complexes'); document.querySelector('input')?.focus(); }}
          className={`flex flex-col items-center gap-1 ${customerSearch ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-medium">검색</span>
        </button>
      </nav>

      <UnitDetailModal
        isOpen={isUnitModalOpen}
        onClose={() => {
          setIsUnitModalOpen(false);
          fetchUnits();
          fetchBuildings();
          fetchComplexes();
        }}
        unit={selectedUnit}
        complexName={selectedComplex?.name || ''}
        buildingName={selectedBuilding?.name || ''}
        onUpdate={fetchUnits}
      />
    </div>
  );
}
