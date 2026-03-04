import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { districtDongMap } from '../data/districtDongMap';

interface ComplexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  complexId?: number | null;
}

interface BuildingConfig {
  id?: number;
  name: string;
  floors: number;
  lines: number;
}

export function ComplexModal({ isOpen, onClose, onSuccess, complexId }: ComplexModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    name: '',
    district: '',
    neighborhood: '',
    building_count: 1,
  });
  const [buildings, setBuildings] = useState<BuildingConfig[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (complexId) {
        setLoading(true);
        (async () => {
          try {
            const { data: complex, error: cError } = await supabase
              .from('complexes')
              .select('*')
              .eq('id', complexId)
              .single();
              
            if (cError) throw cError;

            const { data: buildingsData, error: bError } = await supabase
              .from('buildings')
              .select('id, name, units(floor, unit_number)')
              .eq('complex_id', complexId)
              .order('name');
              
            if (bError) throw bError;

            const formattedBuildings = buildingsData.map((b: any) => {
              let maxFloor = 0;
              let maxLine = 0;
              if (b.units && b.units.length > 0) {
                maxFloor = Math.max(...b.units.map((u: any) => u.floor));
                maxLine = Math.max(...b.units.map((u: any) => parseInt(u.unit_number.slice(-2)) || 0));
              }
              return {
                id: b.id,
                name: b.name,
                floors: maxFloor || 20, // Default if no units
                lines: maxLine || 4     // Default if no units
              };
            });

            setFormData({
              name: complex.name,
              district: complex.district,
              neighborhood: complex.neighborhood,
              building_count: formattedBuildings.length || 1,
            });
            setBuildings(formattedBuildings);
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setFormData({
          name: '',
          district: '',
          neighborhood: '',
          building_count: 1,
        });
        setBuildings([]);
        setStep(1);
      }
    }
  }, [isOpen, complexId]);

  const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'building_count' ? Number(value) : value
    }));
  };

  const handleNext = () => {
    const newBuildings: BuildingConfig[] = [...buildings];
    
    // Adjust building array size based on count
    if (newBuildings.length < formData.building_count) {
      const diff = formData.building_count - newBuildings.length;
      const lastNum = newBuildings.length > 0 ? parseInt(newBuildings[newBuildings.length - 1].name) || 100 : 100;
      for (let i = 1; i <= diff; i++) {
        newBuildings.push({
          name: `${lastNum + i}`,
          floors: 20,
          lines: 4
        });
      }
    } else if (newBuildings.length > formData.building_count) {
      newBuildings.splice(formData.building_count);
    }
    
    setBuildings(newBuildings);
    setStep(2);
  };

  const handleBuildingChange = (index: number, field: keyof BuildingConfig, value: string | number) => {
    setBuildings(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (complexId) {
        // UPDATE Logic
        const { error: updateError } = await supabase
          .from('complexes')
          .update({
            name: formData.name,
            district: formData.district,
            neighborhood: formData.neighborhood
          })
          .eq('id', complexId);
        if (updateError) throw updateError;

        // Get existing buildings
        const { data: existingBuildings, error: getBError } = await supabase
          .from('buildings')
          .select('id, name')
          .eq('complex_id', complexId);
        if (getBError) throw getBError;

        const existingBuildingIds = existingBuildings.map((b: any) => b.id);
        const newBuildingIds = buildings.filter(b => b.id).map(b => b.id);

        // Delete removed buildings
        const buildingsToDelete = existingBuildingIds.filter(bId => !newBuildingIds.includes(bId));
        if (buildingsToDelete.length > 0) {
          // Fetch units to delete
          const { data: unitsToDeleteData } = await supabase.from('units').select('id').in('building_id', buildingsToDelete);
          if (unitsToDeleteData && unitsToDeleteData.length > 0) {
             const uIds = unitsToDeleteData.map(u => u.id);
             await supabase.from('contracts').delete().in('unit_id', uIds);
             await supabase.from('units').delete().in('id', uIds);
          }
          await supabase.from('buildings').delete().in('id', buildingsToDelete);
        }

        for (const b of buildings) {
          let buildingId = b.id;
          if (buildingId) {
            const { error: bUpdateError } = await supabase
              .from('buildings')
              .update({ name: b.name })
              .eq('id', buildingId);
            if (bUpdateError) throw bUpdateError;
          } else {
            const { data: newB, error: bInsertError } = await supabase
              .from('buildings')
              .insert([{ complex_id: complexId, name: b.name }])
              .select()
              .single();
            if (bInsertError) throw bInsertError;
            buildingId = newB.id;
          }

          // Handle units
          const { data: existingUnits, error: uGetError } = await supabase
            .from('units')
            .select('id, floor, unit_number')
            .eq('building_id', buildingId);
          if (uGetError) throw uGetError;

          const unitsToDelete = [];
          const existingUnitSet = new Set();

          for (const u of existingUnits) {
            const line = parseInt(u.unit_number.slice(-2)) || 0;
            if (u.floor > b.floors || line > b.lines) {
              unitsToDelete.push(u.id);
            } else {
              existingUnitSet.add(`${u.floor}-${line}`);
            }
          }

          if (unitsToDelete.length > 0) {
            await supabase.from('contracts').delete().in('unit_id', unitsToDelete);
            await supabase.from('units').delete().in('id', unitsToDelete);
          }

          const unitsToInsert = [];
          for (let f = 1; f <= b.floors; f++) {
            for (let l = 1; l <= b.lines; l++) {
              if (!existingUnitSet.has(`${f}-${l}`)) {
                const unitNum = `${f}${String(l).padStart(2, '0')}`;
                unitsToInsert.push({
                  building_id: buildingId,
                  unit_number: unitNum,
                  floor: f,
                  area_m2: 84.00,
                  status: '공실'
                });
              }
            }
          }

          if (unitsToInsert.length > 0) {
            const { error: uInsError } = await supabase.from('units').insert(unitsToInsert);
            if (uInsError) throw uInsError;
          }
        }

      } else {
        // CREATE Logic
        const { data: complexData, error: complexError } = await supabase
          .from('complexes')
          .insert([{
            name: formData.name,
            district: formData.district,
            neighborhood: formData.neighborhood
          }])
          .select()
          .single();
        
        if (complexError) throw complexError;
        const newComplexId = complexData.id;

        for (const b of buildings) {
          const { data: buildingData, error: buildingError } = await supabase
            .from('buildings')
            .insert([{ complex_id: newComplexId, name: b.name }])
            .select()
            .single();
          
          if (buildingError) throw buildingError;
          const buildingId = buildingData.id;

          const unitsToInsert = [];
          for (let f = 1; f <= b.floors; f++) {
            for (let u = 1; u <= b.lines; u++) {
              const unitNum = `${f}${String(u).padStart(2, '0')}`;
              unitsToInsert.push({
                building_id: buildingId,
                unit_number: unitNum,
                floor: f,
                area_m2: 84.00,
                status: '공실'
              });
            }
          }

          if (unitsToInsert.length > 0) {
            const { error: unitsError } = await supabase.from('units').insert(unitsToInsert);
            if (unitsError) throw unitsError;
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving complex:', error);
      alert('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${step === 1 ? 'max-w-md' : 'max-w-2xl'} overflow-hidden transition-all`}>
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {complexId 
              ? (step === 1 ? '단지 정보 수정 (1/2)' : '동별 상세 설정 수정 (2/2)')
              : (step === 1 ? '새 단지 등록 (1/2)' : '동별 상세 설정 (2/2)')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {step === 1 ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                단지의 기본 정보를 입력해 주세요.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">단지명</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleBasicChange}
                  placeholder="예: 미아래미안"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">구</label>
                  <select
                    name="district"
                    required
                    value={formData.district}
                    onChange={(e) => {
                      handleBasicChange(e);
                      setFormData(prev => ({ ...prev, neighborhood: '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">구를 선택하세요</option>
                    {Object.keys(districtDongMap).map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">동(법정동)</label>
                  <select
                    name="neighborhood"
                    required
                    value={formData.neighborhood}
                    onChange={handleBasicChange}
                    disabled={!formData.district}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                  >
                    <option value="">동을 선택하세요</option>
                    {formData.district && districtDongMap[formData.district]?.map(dong => (
                      <option key={dong} value={dong}>{dong}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">총 동수</label>
                <input
                  type="number"
                  name="building_count"
                  min="1"
                  max="100"
                  value={formData.building_count}
                  onChange={handleBasicChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!formData.name || !formData.district || !formData.neighborhood}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  다음: 동별 상세 설정
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                각 동의 이름, 층수, 라인수(호)를 설정해 주세요.
              </p>

              <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">동 이름</th>
                      <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">층수</th>
                      <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">라인수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {buildings.map((b, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={b.name}
                            onChange={(e) => handleBuildingChange(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={b.floors}
                            onChange={(e) => handleBuildingChange(idx, 'floors', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={b.lines}
                            onChange={(e) => handleBuildingChange(idx, 'lines', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                >
                  이전으로
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '단지 생성 완료'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
