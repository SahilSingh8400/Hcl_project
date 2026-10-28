import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Package, Edit, Trash2, UserCheck } from 'lucide-react';
import Modal from '../components/Modal';

export default function Assets() {
  const { isAdmin } = useAuth();
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchAssets = async () => {
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await api.get(`/assets${params}`);
      setAssets(res.data);
    } catch { toast.error('Failed to load assets'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isAdmin) api.get('/employees?status=active').then(r => setEmployees(r.data));
    fetchAssets();
  }, [filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this asset?')) return;
    try { await api.delete(`/assets/${id}`); toast.success('Asset deleted'); fetchAssets(); }
    catch { toast.error('Failed'); }
  };

  const handleUnassign = async (id) => {
    try { await api.put(`/assets/${id}/assign`, { employee_id: null }); toast.success('Asset unassigned'); fetchAssets(); }
    catch { toast.error('Failed'); }
  };

  const categoryColors = { Laptop:'bg-blue-100 text-blue-700', Monitor:'bg-purple-100 text-purple-700', Mobile:'bg-green-100 text-green-700', Furniture:'bg-yellow-100 text-yellow-700', default:'bg-gray-100 text-gray-700' };
  const conditionBadge = { excellent:'badge-green', good:'badge-blue', fair:'badge-yellow', poor:'badge-red' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Asset Management' : 'My Assets'}</h1>
        {isAdmin && <button onClick={() => { setEditAsset(null); setShowModal(true); }} className="btn-primary"><Plus size={16} />Add Asset</button>}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Assets', value: assets.length, color: 'text-blue-600' },
            { label: 'Assigned', value: assets.filter(a=>a.status==='assigned').length, color: 'text-green-600' },
            { label: 'Available', value: assets.filter(a=>a.status==='available').length, color: 'text-yellow-600' },
            { label: 'Total Value', value: `₹${(assets.reduce((s,a)=>s+(a.current_value||0),0)/100000).toFixed(1)}L`, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="card"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-sm text-gray-500">{s.label}</div></div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="card py-4">
          <div className="flex gap-3">
            {['','available','assigned','maintenance'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus===s?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s||'All'}</button>
            ))}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Asset</th>
                <th className="table-th">Code</th>
                <th className="table-th">Category</th>
                <th className="table-th">Brand / Model</th>
                <th className="table-th">Value</th>
                <th className="table-th">Condition</th>
                <th className="table-th">Assigned To</th>
                <th className="table-th">Status</th>
                {isAdmin && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
              : assets.length === 0 ? <tr><td colSpan={9} className="text-center py-10 text-gray-400"><Package size={40} className="mx-auto mb-3 opacity-30" /><p>No assets found</p></td></tr>
              : assets.map(a => (
                <tr key={a._id} className="table-tr">
                  <td className="table-td"><div className="font-medium text-gray-900">{a.name}</div><div className="text-xs text-gray-500">{a.serial_number}</div></td>
                  <td className="table-td font-mono text-xs">{a.asset_code}</td>
                  <td className="table-td"><span className={`badge ${categoryColors[a.category]||categoryColors.default}`}>{a.category}</span></td>
                  <td className="table-td text-sm">{[a.brand, a.model].filter(Boolean).join(' / ')}</td>
                  <td className="table-td font-medium">₹{(a.current_value||0).toLocaleString()}</td>
                  <td className="table-td"><span className={`badge ${conditionBadge[a.condition]||'badge-gray'}`}>{a.condition}</span></td>
                  <td className="table-td">{a.assigned_to_name || <span className="text-gray-400 text-xs">Unassigned</span>}</td>
                  <td className="table-td"><span className={`badge ${a.status==='assigned'?'badge-green':a.status==='available'?'badge-blue':'badge-yellow'}`}>{a.status}</span></td>
                  {isAdmin && <td className="table-td">
                    <div className="flex gap-1">
                      <button onClick={() => setAssignModal(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Assign/Unassign"><UserCheck size={15} /></button>
                      <button onClick={() => { setEditAsset(a); setShowModal(true); }} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>
                      <button onClick={() => handleDelete(a._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <AssetModal onClose={() => setShowModal(false)} onSaved={fetchAssets} asset={editAsset} />}
      {assignModal && <AssignModal asset={assignModal} employees={employees} onClose={() => setAssignModal(null)} onSaved={fetchAssets} />}
    </div>
  );
}

function AssetModal({ onClose, onSaved, asset }) {
  const [form, setForm] = useState(asset || { name:'', category:'Laptop', brand:'', model:'', serial_number:'', purchase_date:'', purchase_cost:'', condition:'good', notes:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (asset) { await api.put(`/assets/${asset._id}`, form); toast.success('Asset updated'); }
      else { await api.post('/assets', form); toast.success('Asset added'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const f = k => e => setForm(p => ({...p, [k]: e.target.value}));
  return (
    <Modal title={asset ? 'Edit Asset' : 'Add New Asset'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="label">Asset Name *</label><input value={form.name} onChange={f('name')} className="input" required /></div>
        <div><label className="label">Category *</label>
          <select value={form.category} onChange={f('category')} className="input">
            {['Laptop','Monitor','Mobile','Keyboard','Mouse','Headset','Furniture','Vehicle','Other'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="label">Condition</label>
          <select value={form.condition} onChange={f('condition')} className="input">
            <option value="excellent">Excellent</option><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option>
          </select>
        </div>
        <div><label className="label">Brand</label><input value={form.brand||''} onChange={f('brand')} className="input" /></div>
        <div><label className="label">Model</label><input value={form.model||''} onChange={f('model')} className="input" /></div>
        <div><label className="label">Serial Number</label><input value={form.serial_number||''} onChange={f('serial_number')} className="input" /></div>
        <div><label className="label">Purchase Date</label><input type="date" value={form.purchase_date||''} onChange={f('purchase_date')} className="input" /></div>
        <div><label className="label">Purchase Cost (₹)</label><input type="number" value={form.purchase_cost||''} onChange={f('purchase_cost')} className="input" /></div>
        {asset && <div><label className="label">Current Value (₹)</label><input type="number" value={form.current_value||''} onChange={f('current_value')} className="input" /></div>}
        <div className="col-span-2"><label className="label">Notes</label><textarea value={form.notes||''} onChange={f('notes')} className="input h-20 resize-none" /></div>
        <div className="col-span-2 flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Saving...':asset?'Update':'Add Asset'}</button></div>
      </form>
    </Modal>
  );
}

function AssignModal({ asset, employees, onClose, onSaved }) {
  const [empId, setEmpId] = useState(asset.assigned_to || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try { await api.put(`/assets/${asset._id}/assign`, { employee_id: empId || null }); toast.success(empId ? 'Asset assigned' : 'Asset unassigned'); onSaved(); onClose(); }
    catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`Assign: ${asset.name}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div><label className="label">Assign To</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)} className="input">
            <option value="">Unassigned (Available)</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.first_name} {e.last_name} — {e.designation}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3"><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={loading} className="btn-primary">{loading?'Saving...':'Save'}</button></div>
      </div>
    </Modal>
  );
}
