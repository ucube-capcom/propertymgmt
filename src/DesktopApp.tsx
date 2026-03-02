/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UnitDetailModal } from './components/UnitDetailModal';
import { ComplexModal } from './components/ComplexModal';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainContent } from './components/MainContent';
import { ConfirmModal } from './components/ConfirmModal';
import { useRealEstateData } from './hooks/useRealEstateData';
import { supabase } from './lib/supabase';

export function DesktopApp() {
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
    fetchBuildings,
    fetchUnits,
    handleUnitClick,
    handleDeleteComplex,
    toggleDistrict,
    handleSearch,
    handleSearchResultClick,
    confirmModalConfig,
    setConfirmModalConfig
  } = useRealEstateData();

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <Sidebar
        customerSearch={customerSearch}
        setCustomerSearch={setCustomerSearch}
        handleSearch={handleSearch}
        searchResults={searchResults}
        handleSearchResultClick={handleSearchResultClick}
        complexes={complexes}
        selectedComplex={selectedComplex}
        setSelectedComplex={setSelectedComplex}
        buildings={buildings}
        selectedBuilding={selectedBuilding}
        setSelectedBuilding={setSelectedBuilding}
        setIsComplexModalOpen={setIsComplexModalOpen}
        expandedDistricts={expandedDistricts}
        toggleDistrict={toggleDistrict}
        recentContracts={recentContracts}
        setSearchResults={setSearchResults}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
        <Header
          selectedComplex={selectedComplex}
          setEditingComplexId={setEditingComplexId}
          setIsComplexModalOpen={setIsComplexModalOpen}
          handleDeleteComplex={handleDeleteComplex}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <MainContent
          selectedBuilding={selectedBuilding}
          viewMode={viewMode}
          units={units}
          handleUnitClick={handleUnitClick}
          selectedUnit={selectedUnit}
        />
      </main>

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

      <ComplexModal
        isOpen={isComplexModalOpen}
        complexId={editingComplexId}
        onClose={() => {
          setIsComplexModalOpen(false);
          setEditingComplexId(null);
        }}
        onSuccess={async () => {
          fetchComplexes();
          if (selectedComplex && editingComplexId === selectedComplex.id) {
            try {
              const { data, error } = await supabase
                .from('buildings')
                .select('*')
                .eq('complex_id', selectedComplex.id)
                .order('name');
                
              if (error) throw error;
              setBuildings(data || []);
              if (data && data.length > 0) setSelectedBuilding(data[0]);
              else setSelectedBuilding(null);
            } catch (err) {
              console.error(err);
            }
          }
        }}
      />

      <ConfirmModal
        isOpen={confirmModalConfig?.isOpen || false}
        message={confirmModalConfig?.message || ''}
        onConfirm={confirmModalConfig?.onConfirm || (() => {})}
        onCancel={() => setConfirmModalConfig(null)}
      />
    </div>
  );
}

