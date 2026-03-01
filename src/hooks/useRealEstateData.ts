import React, { useState, useEffect, useCallback } from 'react';
import { Complex, Building, Unit } from '../types';

export function useRealEstateData() {
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isComplexModalOpen, setIsComplexModalOpen] = useState(false);
  const [editingComplexId, setEditingComplexId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [recentContracts, setRecentContracts] = useState<any[]>([]);
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({});
  const [confirmModalConfig, setConfirmModalConfig] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; } | null>(null);

  const fetchComplexes = useCallback(async () => {
    try {
      const res = await fetch('/api/complexes');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setComplexes(data);
      
      setSelectedComplex(prev => prev || (data.length > 0 ? data[0] : null));
      
      const cRes = await fetch('/api/contracts/search?q=');
      const cData = await cRes.json();
      setRecentContracts(cData.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch complexes:', err);
    }
  }, []);

  useEffect(() => {
    fetchComplexes();
  }, [fetchComplexes]);

  useEffect(() => {
    if (selectedComplex) {
      fetch(`/api/complexes/${selectedComplex.id}/buildings`)
        .then(res => res.json())
        .then(data => {
          setBuildings(data);
          if (data.length > 0) setSelectedBuilding(data[0]);
          else setSelectedBuilding(null);
        })
        .catch(err => console.error(err));
    } else {
      setBuildings([]);
      setSelectedBuilding(null);
    }
  }, [selectedComplex]);

  const fetchUnits = useCallback(() => {
    if (!selectedBuilding) {
      setUnits([]);
      return;
    }
    fetch(`/api/buildings/${selectedBuilding.id}/units`)
      .then(res => res.json())
      .then(data => setUnits(data))
      .catch(err => console.error(err));
  }, [selectedBuilding]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleUnitClick = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsUnitModalOpen(true);
  };

  const handleDeleteComplex = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setConfirmModalConfig({
      isOpen: true,
      message: '정말 이 단지를 삭제하시겠습니까?\n모든 데이터가 영구 삭제됩니다.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/complexes/${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchComplexes();
            if (selectedComplex?.id === id) {
              setSelectedComplex(null);
              setSelectedBuilding(null);
              setUnits([]);
            }
            setConfirmModalConfig(null);
          } else {
            const errorData = await res.json();
            setConfirmModalConfig({
              isOpen: true,
              message: `단지 삭제 실패: ${errorData.error || '알 수 없는 오류'}`,
              onConfirm: () => setConfirmModalConfig(null)
            });
          }
        } catch (err: any) {
          console.error('Failed to delete complex:', err);
          setConfirmModalConfig({
            isOpen: true,
            message: `단지 삭제 중 오류 발생: ${err.message}`,
            onConfirm: () => setConfirmModalConfig(null)
          });
        }
      }
    });
  };

  const toggleDistrict = (district: string) => {
    setExpandedDistricts(prev => ({
      ...prev,
      [district]: !prev[district]
    }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSearch) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/contracts/search?q=${encodeURIComponent(customerSearch)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchResultClick = async (result: any) => {
    const complex = complexes.find(c => c.id === result.complex_id);
    if (complex) setSelectedComplex(complex);

    try {
      const bRes = await fetch(`/api/complexes/${result.complex_id}/buildings`);
      const bData = await bRes.json();
      setBuildings(bData);
      const building = bData.find((b: any) => b.id === result.building_id);
      if (building) setSelectedBuilding(building);

      const uRes = await fetch(`/api/buildings/${result.building_id}/units`);
      const uData = await uRes.json();
      setUnits(uData);
      const unit = uData.find((u: any) => u.id === result.unit_id);
      if (unit) {
        setSelectedUnit(unit);
        setIsUnitModalOpen(true);
      }
    } catch (err) {
      console.error('Error jumping to unit:', err);
    }
  };

  return {
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
    isComplexModalOpen,
    setIsComplexModalOpen,
    editingComplexId,
    setEditingComplexId,
    customerSearch,
    setCustomerSearch,
    searchResults,
    setSearchResults,
    viewMode,
    setViewMode,
    recentContracts,
    expandedDistricts,
    fetchComplexes,
    fetchUnits,
    handleUnitClick,
    handleDeleteComplex,
    toggleDistrict,
    handleSearch,
    handleSearchResultClick,
    confirmModalConfig,
    setConfirmModalConfig
  };
}
