import React, { useState, useEffect, useCallback } from 'react';
import { Complex, Building, Unit } from '../types';
import { supabase } from '../lib/supabase';

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
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);

  const fetchComplexes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('complexes')
        .select(`
          *,
          buildings (
            id,
            units (id, status)
          )
        `);
      if (error) throw error;
      
      const mappedComplexes = (data || []).map((c: any) => {
        const buildingCount = c.buildings ? c.buildings.length : 0;
        const unitCount = c.buildings ? c.buildings.reduce((sum: number, b: any) => {
          const validUnits = b.units ? b.units.filter((u: any) => u.status !== '빈공간') : [];
          return sum + validUnits.length;
        }, 0) : 0;
        
        // Remove the nested buildings array to keep the Complex object clean
        const { buildings, ...rest } = c;
        
        return {
          ...rest,
          building_count: buildingCount,
          unit_count: unitCount
        };
      });
      
      setComplexes(mappedComplexes);
      
      setSelectedComplex(prev => {
        if (!prev) return mappedComplexes.length > 0 ? mappedComplexes[0] : null;
        const updated = mappedComplexes.find((c: any) => c.id === prev.id);
        return updated || prev;
      });
      
      // Fetch recent contracts
      const { data: cData, error: cError } = await supabase
        .from('contracts')
        .select(`
          *,
          tenant:persons!contracts_tenant_id_fkey(name),
          units (
            unit_number,
            building_id,
            buildings (
              name,
              complex_id,
              complexes (
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (!cError && cData) {
        const mappedRecent = cData.map((c: any) => ({
          ...c,
          customer_name: c.tenant?.name,
          unit_number: c.units?.unit_number,
          building_id: c.units?.building_id,
          building_name: c.units?.buildings?.name,
          complex_id: c.units?.buildings?.complex_id,
          complex_name: c.units?.buildings?.complexes?.name
        }));
        setRecentContracts(mappedRecent);
      }
    } catch (err) {
      console.error('Failed to fetch complexes from Supabase:', err);
      // Ensure state is cleared on error if needed, or keep previous state
      // For now, we just log the error as requested to avoid mock data
    }
  }, []);

  useEffect(() => {
    fetchComplexes();
  }, [fetchComplexes]);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (selectedComplex) {
        try {
          const { data, error } = await supabase
            .from('buildings')
            .select('*')
            .eq('complex_id', selectedComplex.id);
            
          if (error) throw error;
          
          const sortedBuildings = (data || []).sort((a, b) => 
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          );
          
          setBuildings(sortedBuildings);
          if (sortedBuildings.length > 0) {
            setSelectedBuilding(prev => {
              if (prev && prev.complex_id === selectedComplex.id) {
                return prev;
              }
              return sortedBuildings[0];
            });
          } else {
            setSelectedBuilding(null);
          }
        } catch (err) {
          console.error('Failed to fetch buildings from Supabase:', err);
          setBuildings([]);
          setSelectedBuilding(null);
        }
      } else {
        setBuildings([]);
        setSelectedBuilding(null);
      }
    };
    fetchBuildings();
  }, [selectedComplex]);

  const fetchUnits = useCallback(async () => {
    if (!selectedBuilding) {
      setUnits([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          contracts (
            id,
            type,
            expiration_date,
            created_at,
            tenant:persons!contracts_tenant_id_fkey(name)
          )
        `)
        .eq('building_id', selectedBuilding.id);
        
      if (error) throw error;
      
      const mappedUnits = (data || []).map((unit: any) => {
        const latestContract = unit.contracts && unit.contracts.length > 0 
          ? unit.contracts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
          : null;
          
        return {
          ...unit,
          contract_id: latestContract?.id,
          contract_type: latestContract?.type,
          customer_name: latestContract?.tenant?.name,
          expiration_date: latestContract?.expiration_date,
        };
      });
      
      setUnits(mappedUnits);
      
      // Update selectedUnit if it exists to reflect any status changes
      setSelectedUnit(prev => {
        if (!prev) return prev;
        const updated = mappedUnits.find((u: any) => u.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error('Failed to fetch units from Supabase:', err);
      setUnits([]);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    if (selectedUnit && selectedBuilding && selectedUnit.building_id !== selectedBuilding.id) {
      setSelectedUnit(null);
    }
  }, [selectedBuilding, selectedUnit]);

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
          const { error } = await supabase.from('complexes').delete().eq('id', id);
          if (!error) {
            fetchComplexes();
            if (selectedComplex?.id === id) {
              setSelectedComplex(null);
              setSelectedBuilding(null);
              setUnits([]);
            }
            setConfirmModalConfig(null);
          } else {
            setConfirmModalConfig({
              isOpen: true,
              message: `단지 삭제 실패: ${error.message || '알 수 없는 오류'}`,
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
      const q = customerSearch;
      const terms = q.toLowerCase().split(' ').filter(t => t.trim().length > 0);
      if (terms.length === 0) {
        setSearchResults([]);
        return;
      }

      const results: any[] = [];

      // 1. Search persons
      const { data: persons, error: pError } = await supabase
        .from('persons')
        .select('id, name, phone')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

      if (pError) throw pError;

      if (persons && persons.length > 0) {
        const personIds = persons.map(p => p.id);
        const { data: contracts, error: cError } = await supabase
          .from('contracts')
          .select(`
            id, 
            tenant_id,
            unit_id,
            units (
              unit_number,
              building_id,
              buildings (
                name,
                complex_id,
                complexes (
                  name
                )
              )
            )
          `)
          .in('tenant_id', personIds);

        if (cError) throw cError;

        if (contracts) {
          contracts.forEach((c: any) => {
            const person = persons.find(p => p.id === c.tenant_id);
            results.push({
              type: 'contract',
              id: c.id,
              customer_name: person?.name || 'Unknown',
              customer_phone: person?.phone || '',
              unit_id: c.unit_id,
              unit_number: c.units?.unit_number,
              building_id: c.units?.building_id,
              building_name: c.units?.buildings?.name,
              complex_id: c.units?.buildings?.complex_id,
              complex_name: c.units?.buildings?.complexes?.name
            });
          });
        }
      }

      // 2. Search Units
      const { data: allUnits, error: uError } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          building_id,
          buildings (
            name,
            complex_id,
            complexes (
              name
            )
          )
        `);

      if (uError) throw uError;

      if (allUnits) {
        const matchedUnits = allUnits.filter((u: any) => {
          const complexName = u.buildings?.complexes?.name || '';
          const buildingName = u.buildings?.name || '';
          const unitNumber = u.unit_number || '';
          
          const fullName = `${complexName} ${buildingName}동 ${unitNumber}호`.toLowerCase();
          const shortName = `${complexName} ${buildingName} ${unitNumber}`.toLowerCase();
          
          return terms.every(t => fullName.includes(t) || shortName.includes(t));
        });

        matchedUnits.slice(0, 20).forEach((u: any) => {
          if (!results.some(r => r.unit_id === u.id && r.type === 'unit')) {
            results.push({
              type: 'unit',
              id: `unit_${u.id}`,
              customer_name: '단지/호수 검색',
              unit_id: u.id,
              unit_number: u.unit_number,
              building_id: u.building_id,
              building_name: u.buildings?.name,
              complex_id: u.buildings?.complex_id,
              complex_name: u.buildings?.complexes?.name
            });
          }
        });
      }

      setSearchResults(results);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchResultClick = async (result: any) => {
    console.log('handleSearchResultClick result:', result);
    const complex = complexes.find(c => c.id === result.complex_id);
    if (complex) setSelectedComplex(complex);

    try {
      const { data: bData, error: bError } = await supabase
        .from('buildings')
        .select('*')
        .eq('complex_id', result.complex_id);
        
      if (bError) throw bError;
      
      const sortedBuildings = (bData || []).sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      
      setBuildings(sortedBuildings);
      const building = sortedBuildings.find((b: any) => b.id === result.building_id);
      if (building) setSelectedBuilding(building);

      const { data: uData, error: uError } = await supabase
        .from('units')
        .select(`
          *,
          contracts (
            id,
            type,
            expiration_date,
            created_at,
            tenant:persons!contracts_tenant_id_fkey(name)
          )
        `)
        .eq('building_id', result.building_id);
        
      if (uError) throw uError;
      
      const mappedUnits = (uData || []).map((unit: any) => {
        const latestContract = unit.contracts && unit.contracts.length > 0 
          ? unit.contracts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
          : null;
          
        return {
          ...unit,
          contract_id: latestContract?.id,
          contract_type: latestContract?.type,
          customer_name: latestContract?.tenant?.name,
          expiration_date: latestContract?.expiration_date,
        };
      });
      
      setUnits(mappedUnits);
      const unit = mappedUnits.find((u: any) => u.id === result.unit_id);
      console.log('Found unit:', unit);
      if (unit) {
        setSelectedUnit(unit);
        if (result.type === 'contract') {
          setSelectedContractId(result.id);
        } else if (result.type !== 'unit' && result.id && typeof result.id === 'number') {
          // Recent contracts don't have a 'type' field, but their id is a number
          setSelectedContractId(result.id);
        } else {
          setSelectedContractId(null);
        }
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
    setConfirmModalConfig,
    selectedContractId,
    setSelectedContractId
  };
}
