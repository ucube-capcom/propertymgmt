import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

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
    district: '강북구',
    neighborhood: '미아동',
    building_count: 1,
  });
  const [buildings, setBuildings] = useState<BuildingConfig[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (complexId) {
        setLoading(true);
        fetch(`/api/complexes/${complexId}`)
          .then(res => res.json())
          .then(data => {
            setFormData({
              name: data.name,
              district: data.district,
              neighborhood: data.neighborhood,
              building_count: data.buildings.length || 1,
            });
            setBuildings(data.buildings);
            setLoading(false);
          })
          .catch(err => {
            console.error(err);
            setLoading(false);
          });
      } else {
        setFormData({
          name: '',
          district: '강북구',
          neighborhood: '미아동',
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
      const url = complexId ? `/api/complexes/${complexId}` : '/api/complexes';
      const method = complexId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          buildings
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert(complexId ? '수정 실패' : '등록 실패');
      }
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
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleBasicChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">동(행정동)</label>
                  <select
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleBasicChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="미아동">미아동</option>
                    <option value="삼각산동">삼각산동</option>
                    <option value="송천동">송천동</option>
                    <option value="송중동">송중동</option>
                    <option value="번동">번동</option>
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
                  disabled={!formData.name}
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
