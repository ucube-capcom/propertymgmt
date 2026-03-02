import React, { useState, useEffect } from 'react';
import { X, History, Users, Building2, Edit2, Trash2 } from 'lucide-react';
import { Unit, Contract, ContractFormData } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { supabase } from '../lib/supabase';

interface UnitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit | null;
  complexName: string;
  buildingName: string;
  onUpdate?: () => void;
}

const initialFormState: ContractFormData = {
  unit_id: 0,
  type: '매매',
  price_sale: 0,
  price_deposit: 0,
  price_rent: 0,
  customer_name: '',
  customer_phone: '',
  owner_name: '',
  contract_date: new Date().toISOString().split('T')[0],
  move_in_date: '',
  expiration_date: '',
  notes: ''
};

export function UnitDetailModal({ isOpen, onClose, unit, complexName, buildingName, onUpdate }: UnitDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'register'>('history');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [formData, setFormData] = useState<ContractFormData>(initialFormState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (unit && isOpen) {
      fetchContracts();
      resetForm();
      setActiveTab('history');
    }
  }, [unit, isOpen]);

  const resetForm = () => {
    setFormData({ ...initialFormState, unit_id: unit?.id || 0 });
    setEditingId(null);
  };

  const fetchContracts = async () => {
    if (!unit) return;
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          tenant:persons!contracts_tenant_id_fkey(name, phone),
          owner:persons!contracts_owner_id_fkey(name, phone)
        `)
        .eq('unit_id', unit.id)
        .order('contract_date', { ascending: false });
        
      if (error) throw error;
      
      const mappedContracts = (data || []).map((contract: any) => ({
        ...contract,
        customer_name: contract.tenant?.name || '',
        customer_phone: contract.tenant?.phone || '',
        owner_name: contract.owner?.name || ''
      }));
      
      setContracts(mappedContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.startsWith('price_') ? Number(value) : value
    }));
  };

  const handleEdit = (contract: Contract) => {
    setFormData({
      unit_id: contract.unit_id,
      type: contract.type,
      price_sale: contract.price_sale,
      price_deposit: contract.price_deposit,
      price_rent: contract.price_rent,
      customer_name: contract.customer_name,
      customer_phone: contract.customer_phone,
      owner_name: contract.owner_name,
      contract_date: contract.contract_date,
      move_in_date: contract.move_in_date,
      expiration_date: contract.expiration_date,
      notes: contract.notes
    });
    setEditingId(contract.id);
    setActiveTab('register');
  };

  const handleDeleteClick = (id: number) => {
    setConfirmModal({
      isOpen: true,
      message: '정말로 이 계약 이력을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.',
      onConfirm: () => handleDelete(id)
    });
  };

  const handleDelete = async (id: number) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try {
      // Get unit_id before deleting to update status later
      const { data: contract } = await supabase.from('contracts').select('unit_id').eq('id', id).single();
      
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      
      if (!error) {
        fetchContracts();
        if (onUpdate) onUpdate();
        
        // Update unit status if no contracts left
        if (contract?.unit_id) {
           const { count } = await supabase
            .from('contracts')
            .select('id', { count: 'exact', head: true })
            .eq('unit_id', contract.unit_id);
            
           if (count === 0) {
             await supabase.from('units').update({ status: '공실' }).eq('id', contract.unit_id);
           }
        }
      } else {
        alert(`삭제 실패: ${error.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('삭제 중 네트워크 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Find or create tenant
      let tenantId = null;
      const customerName = formData.customer_name.trim();
      const customerPhone = formData.customer_phone ? formData.customer_phone.trim() : null;
      
      if (customerPhone) {
        const { data: existingTenant } = await supabase
          .from('persons')
          .select('id')
          .eq('phone', customerPhone)
          .maybeSingle();
        
        if (existingTenant) {
          tenantId = existingTenant.id;
          // Update name if changed? Let's just keep ID for now or update name
          await supabase.from('persons').update({ name: customerName }).eq('id', tenantId);
        }
      }
      
      if (!tenantId) {
        const { data: newTenant, error: tenantError } = await supabase
          .from('persons')
          .insert([{ name: customerName, phone: customerPhone }])
          .select('id')
          .single();
          
        if (tenantError) throw tenantError;
        tenantId = newTenant.id;
      }

      // 2. Find or create owner
      let ownerId = null;
      const ownerName = formData.owner_name ? formData.owner_name.trim() : null;
      
      if (ownerName) {
        const { data: existingOwner } = await supabase
          .from('persons')
          .select('id')
          .eq('name', ownerName)
          .maybeSingle();
          
        if (existingOwner) {
          ownerId = existingOwner.id;
        } else {
          const { data: newOwner, error: ownerError } = await supabase
            .from('persons')
            .insert([{ name: ownerName }])
            .select('id')
            .single();
            
          if (ownerError && ownerError.code !== '23505') { // Ignore duplicate error if any race condition
             // If error, maybe just proceed without ownerId or handle it
             console.error('Error creating owner:', ownerError);
          } else if (newOwner) {
            ownerId = newOwner.id;
          }
        }
      }

      // 3. Insert or Update Contract
      const contractData = {
        unit_id: formData.unit_id,
        tenant_id: tenantId,
        owner_id: ownerId,
        type: formData.type,
        price_sale: formData.type === '매매' ? (formData.price_sale || 0) : 0,
        price_deposit: formData.type !== '매매' ? (formData.price_deposit || 0) : 0,
        price_rent: formData.price_rent || 0,
        contract_date: formData.contract_date || null,
        move_in_date: formData.move_in_date || null,
        expiration_date: formData.expiration_date || null,
        notes: formData.notes,
        is_active: true
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase
          .from('contracts')
          .update(contractData)
          .eq('id', editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('contracts')
          .insert([contractData]);
        error = insertError;
      }
      
      if (error) throw error;
      
      // 4. Update Unit Status
      await supabase.from('units').update({ status: '거주중' }).eq('id', formData.unit_id);

      fetchContracts();
      resetForm();
      setActiveTab('history');
      if (onUpdate) onUpdate();
      
    } catch (error: any) {
      console.error('Error saving contract:', error);
      alert(`저장 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const handleToggleEmptySpace = async () => {
    if (!unit) return;
    
    const newStatus = unit.status === '빈공간' ? '공실' : '빈공간';
    
    if (newStatus === '빈공간' && contracts.length > 0) {
      alert('계약 이력이 있는 호수는 빈공간으로 처리할 수 없습니다. 먼저 계약 이력을 삭제해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('units')
        .update({ status: newStatus })
        .eq('id', unit.id);

      if (error) throw error;
      
      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error toggling empty space:', error);
      alert(`상태 변경 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  if (!isOpen || !unit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {complexName} {buildingName}동 {unit.unit_number}호
            </h2>
            <p className="text-sm text-gray-500">{unit.area}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleEmptySpace}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                unit.status === '빈공간' 
                  ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' 
                  : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
              }`}
            >
              {unit.status === '빈공간' ? '빈공간 해제' : '빈공간 처리'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'} ${unit.status === '빈공간' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => unit.status !== '빈공간' && setActiveTab('history')}
            disabled={unit.status === '빈공간'}
          >
            계약 이력 관리
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'register' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'} ${unit.status === '빈공간' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => {
              if (unit.status === '빈공간') return;
              if (activeTab !== 'register') resetForm();
              setActiveTab('register');
            }}
            disabled={unit.status === '빈공간'}
          >
            {editingId ? '계약 정보 수정' : '새 계약 등록'}
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-gray-50">
          {unit.status === '빈공간' ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
              <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">빈공간으로 처리된 호수입니다</p>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                실제로는 존재하지 않는 호수입니다.<br/>
                계약을 등록하려면 우측 상단의 '빈공간 해제' 버튼을 클릭하세요.
              </p>
            </div>
          ) : activeTab === 'history' ? (
            <div className="space-y-4">
              {contracts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500">등록된 계약 이력이 없습니다.</p>
                  <button 
                    onClick={() => setActiveTab('register')}
                    className="mt-4 text-blue-600 font-bold hover:underline"
                  >
                    첫 고객 등록하기
                  </button>
                </div>
              ) : (
                contracts.map((contract) => (
                  <div key={contract.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          contract.type === '매매' ? 'bg-red-100 text-red-700' :
                          contract.type === '전세' ? 'bg-green-100 text-green-700' : 
                          contract.type === '단기' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {contract.type}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{contract.contract_date} 계약</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(contract)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(contract.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">거래 금액</span>
                          <span className="text-lg font-bold text-gray-900">
                            {contract.type === '매매' && `${contract.price_sale.toLocaleString()}만원`}
                            {contract.type === '전세' && `${contract.price_deposit.toLocaleString()}만원`}
                            {contract.type === '월세' && `${contract.price_deposit.toLocaleString()} / ${contract.price_rent.toLocaleString()}만원`}
                            {contract.type === '단기' && `${contract.price_deposit.toLocaleString()} / ${contract.price_rent.toLocaleString()}만원`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">고객 (임차/매수)</span>
                          <div className="font-bold text-gray-900">{contract.customer_name}</div>
                          <div className="text-xs text-gray-500">{contract.customer_phone || '연락처 미등록'}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">소유자 (임대/매도)</span>
                          <div className="font-bold text-gray-900">{contract.owner_name || '미등록'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between px-2">
                        <span className="text-gray-500">입주일</span>
                        <span className="font-medium">{contract.move_in_date || '-'}</span>
                      </div>
                      <div className="flex justify-between px-2 border-l border-gray-100">
                        <span className="text-gray-500">만기일</span>
                        <span className="font-medium text-red-600">{contract.expiration_date || '-'}</span>
                      </div>
                    </div>

                    {contract.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                        &quot;{contract.notes}&quot;
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    거래 유형 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {['매매', '전세', '월세'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: t as any }))}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold border transition-all ${
                          formData.type === t 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    계약일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="contract_date"
                    value={formData.contract_date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {formData.type === '매매' ? '매매가' : '보증금'} (만원) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name={formData.type === '매매' ? 'price_sale' : 'price_deposit'}
                    value={formData.type === '매매' ? formData.price_sale : formData.price_deposit}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                {formData.type === '월세' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      월세 (만원) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price_rent"
                      value={formData.price_rent}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    고객(임차/매수) 정보 <span className="text-red-500">*</span>
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      name="customer_name"
                      placeholder="고객 성함 (필수)"
                      value={formData.customer_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      name="customer_phone"
                      placeholder="연락처 (예: 010-1234-5678)"
                      value={formData.customer_phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    소유자(임대/매도) 정보
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      name="owner_name"
                      placeholder="소유자 성함"
                      value={formData.owner_name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">입주일</label>
                  <input
                    type="date"
                    name="move_in_date"
                    value={formData.move_in_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">만기일</label>
                  <input
                    type="date"
                    name="expiration_date"
                    value={formData.expiration_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">특이사항 및 메모</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="계약 시 특이사항이나 고객 성향 등을 메모하세요."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab('history');
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  {editingId ? '수정 내용 저장' : '계약 정보 등록'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
