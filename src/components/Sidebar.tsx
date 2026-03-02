import React from 'react';
import { Building2, Search, ChevronRight, Users, Plus, MapPin, ChevronDown } from 'lucide-react';
import { Complex, Building } from '../types';

interface SidebarProps {
  customerSearch: string;
  setCustomerSearch: (val: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  searchResults: any[];
  handleSearchResultClick: (result: any) => void;
  complexes: Complex[];
  selectedComplex: Complex | null;
  setSelectedComplex: (complex: Complex | null) => void;
  buildings: Building[];
  selectedBuilding: Building | null;
  setSelectedBuilding: (building: Building | null) => void;
  setIsComplexModalOpen: (isOpen: boolean) => void;
  expandedDistricts: Record<string, boolean>;
  toggleDistrict: (district: string) => void;
  recentContracts: any[];
  setSearchResults: (results: any[]) => void;
}

export function Sidebar({
  customerSearch,
  setCustomerSearch,
  handleSearch,
  searchResults,
  handleSearchResultClick,
  complexes,
  selectedComplex,
  setSelectedComplex,
  buildings,
  selectedBuilding,
  setSelectedBuilding,
  setIsComplexModalOpen,
  expandedDistricts,
  toggleDistrict,
  recentContracts,
  setSearchResults
}: SidebarProps) {
  const [complexFilter, setComplexFilter] = React.useState('');

  const filteredComplexes = complexes.filter(c => 
    c.name.toLowerCase().includes(complexFilter.toLowerCase()) ||
    c.district.toLowerCase().includes(complexFilter.toLowerCase())
  );

  const complexesByDistrict = filteredComplexes.reduce((acc, complex) => {
    if (!acc[complex.district]) acc[complex.district] = [];
    acc[complex.district].push(complex);
    return acc;
  }, {} as Record<string, Complex[]>);

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-gray-900 tracking-tight">부동산 고객관리</h1>
        </div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="단지, 동/호수, 고객 검색..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {customerSearch && searchResults.length > 0 ? (
          <div className="p-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block px-2">
              검색 결과
            </label>
            <div className="space-y-2 px-2">
              {searchResults.map(result => (
                <button
                  key={result.id}
                  onClick={() => handleSearchResultClick(result)}
                  className="w-full text-left p-3 rounded-lg border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-bold text-blue-800">
                      {result.type === 'unit' ? '단지/호수 검색' : result.customer_name}
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600" />
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {result.complex_name} {result.building_name}동 {result.unit_number}호
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="p-4">
              <div className="flex items-center gap-2 px-2 mb-4 text-blue-600">
                <Users className="w-5 h-5" />
                <span className="text-sm font-bold">고객 관리 메뉴</span>
              </div>
          
              <div className="flex items-center justify-between mb-3 px-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  관리 단지
                </label>
                <button 
                  onClick={() => setIsComplexModalOpen(true)}
                  className="p-1 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                  title="단지 추가"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="px-2 mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="단지명 필터..."
                    value={complexFilter}
                    onChange={(e) => setComplexFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                  <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-2">
                {(Object.entries(complexesByDistrict) as [string, Complex[]][]).map(([district, districtComplexes]) => (
                  <div key={district} className="space-y-1">
                    <button
                      onClick={() => toggleDistrict(district)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        <span>{district}</span>
                      </div>
                      <ChevronDown className={`w-3 h-3 transition-transform ${expandedDistricts[district] ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {(expandedDistricts[district] ?? true) && (
                      <div className="space-y-1 ml-2 border-l border-gray-100 pl-2">
                        {districtComplexes.map(complex => (
                          <div key={complex.id} className="group relative">
                            <button
                              onClick={() => {
                                setSelectedComplex(complex);
                                setSearchResults([]);
                                setCustomerSearch('');
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                                selectedComplex?.id === complex.id
                                  ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <span className="truncate pr-12">{complex.name}</span>
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">
                                {complex.building_count}동
                              </span>
                            </button>
                            {selectedComplex?.id === complex.id && buildings.length > 0 && (
                              <div className="mt-1.5 mb-2 px-2 grid grid-cols-3 gap-1.5">
                                {buildings.map(building => (
                                  <button
                                    key={building.id}
                                    onClick={() => setSelectedBuilding(building)}
                                    className={`relative text-xs py-1.5 rounded-md text-center transition-colors ${
                                      selectedBuilding?.id === building.id
                                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                  >
                                    {building.name}동
                                    {building.has_contract && (
                                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {recentContracts.length > 0 && !customerSearch && (
              <div className="p-4 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block px-2">
                  최근 등록 고객
                </label>
                <div className="space-y-2 px-2">
                  {recentContracts.map(contract => (
                    <button
                      key={contract.id}
                      onClick={() => handleSearchResultClick(contract)}
                      className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors group"
                    >
                      <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600">{contract.customer_name}</div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {contract.complex_name} {contract.building_name}동 {contract.unit_number}호
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            AD
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">홍길동 소장</div>
            <div className="text-xs text-gray-500 truncate">서울부동산 (미아동)</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Database Online</span>
        </div>
      </div>
    </aside>
  );
}
