import React from 'react';
import { Home, ChevronRight, Edit2, Trash2, LayoutGrid, Users } from 'lucide-react';
import { Complex, Building } from '../types';

interface HeaderProps {
  selectedComplex: Complex | null;
  setEditingComplexId: (id: number | null) => void;
  setIsComplexModalOpen: (isOpen: boolean) => void;
  handleDeleteComplex: (e: React.MouseEvent, id: number) => void;
  buildings: Building[];
  selectedBuilding: Building | null;
  setSelectedBuilding: (building: Building | null) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export function Header({
  selectedComplex,
  setEditingComplexId,
  setIsComplexModalOpen,
  handleDeleteComplex,
  buildings,
  selectedBuilding,
  setSelectedBuilding,
  viewMode,
  setViewMode
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Home className="w-4 h-4" />
            <ChevronRight className="w-4 h-4" />
            <span className="font-medium text-gray-900">{selectedComplex?.name || '단지 선택'}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {selectedComplex ? selectedComplex.name : '단지를 선택해주세요'}
            {selectedComplex && (
              <>
                <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {selectedComplex.neighborhood}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => {
                      setEditingComplexId(selectedComplex.id);
                      setIsComplexModalOpen(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="단지 수정"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteComplex(e, selectedComplex.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="단지 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </h2>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <LayoutGrid className="w-5 h-5 text-blue-500" />
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase block leading-none mb-1">총 세대</span>
              <span className="text-lg font-bold text-gray-900 leading-none">{selectedComplex?.unit_count || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Building Selector */}
      {selectedComplex && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
              {buildings.map(building => (
                <button
                  key={building.id}
                  onClick={() => setSelectedBuilding(building)}
                  className={`
                    px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                    ${selectedBuilding?.id === building.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}
                  `}
                >
                  {building.name}동
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
