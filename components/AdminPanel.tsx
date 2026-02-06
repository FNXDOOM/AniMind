import React, { useEffect, useState } from 'react';
import { Users, Server, Database, Activity, AlertTriangle, Shield, Terminal, Settings, RefreshCw, Power, Loader2 } from 'lucide-react';
import { getAllUsers } from '../services/dbService';

const AdminPanel: React.FC = () => {
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load real users on mount
  useEffect(() => {
    const fetchUsers = async () => {
        setLoadingUsers(true);
        const users = await getAllUsers();
        setRealUsers(users);
        setLoadingUsers(false);
    };
    fetchUsers();
  }, []);

  const stats = [
    { label: 'Total Users', value: realUsers.length > 0 ? realUsers.length.toString() : '...', icon: <Users size={24} />, color: 'text-primary' },
    { label: 'Server Load', value: '34%', icon: <Server size={24} />, color: 'text-green-400' },
    { label: 'DB Size', value: '450 MB', icon: <Database size={24} />, color: 'text-secondary' },
    { label: 'API Latency', value: '42ms', icon: <Activity size={24} />, color: 'text-purple-400' },
  ];

  const logs = [
    "[INFO] System backup completed successfully at 04:00 AM.",
    "[WARN] High latency detected on node-us-east-1.",
    "[INFO] Cache flushed for region: ap-northeast.",
    "[ERROR] Failed to sync with external CDN provider (Retrying...)",
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
             <Shield size={32} className="text-secondary" />
             Admin Dashboard
          </h1>
          <p className="text-gray-400 mt-2">System overview and management controls.</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-surface border border-white/10 hover:bg-white/5 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                <Settings size={16} /> Config
            </button>
            <button className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                <AlertTriangle size={16} /> Emergency Stop
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-surface border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                {stat.icon}
             </div>
             <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">{stat.label}</p>
             <h3 className={`text-3xl font-black ${stat.color}`}>{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Management */}
          <div className="lg:col-span-2 bg-surface border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-white">Registered Users</h3>
                  <button className="text-xs text-primary font-bold hover:underline">View All</button>
              </div>
              <div className="overflow-x-auto">
                  {loadingUsers ? (
                      <div className="p-10 flex justify-center">
                          <Loader2 className="animate-spin text-primary" />
                      </div>
                  ) : (
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-black/20 text-xs uppercase font-bold text-gray-500">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {realUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No users found. (Check RLS Policies)
                                    </td>
                                </tr>
                            ) : realUsers.map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {u.avatar_url && <img src={u.avatar_url} className="w-8 h-8 rounded-full bg-white/10" />}
                                            <div className="font-bold text-white">{u.username || 'Unknown'}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.is_admin ? 'bg-secondary/10 text-secondary' : 'bg-white/5 text-gray-300'}`}>
                                            {u.is_admin ? 'Admin' : 'User'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs">
                                            {new Date(u.updated_at || Date.now()).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-xs font-bold hover:text-white transition-colors">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  )}
              </div>
          </div>

          {/* Quick Actions & Logs */}
          <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6">
                  <h3 className="font-bold text-lg text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                      <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group">
                          <span className="text-sm font-medium text-gray-300 group-hover:text-white">Clear System Cache</span>
                          <RefreshCw size={16} className="text-gray-500 group-hover:text-primary" />
                      </button>
                      <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group">
                          <span className="text-sm font-medium text-gray-300 group-hover:text-white">Restart API Service</span>
                          <Power size={16} className="text-gray-500 group-hover:text-secondary" />
                      </button>
                      <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group">
                          <span className="text-sm font-medium text-gray-300 group-hover:text-white">Maintenance Mode</span>
                          <div className="w-8 h-4 bg-gray-600 rounded-full relative">
                              <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full"></div>
                          </div>
                      </button>
                  </div>
              </div>

              {/* System Logs */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-xs">
                  <h3 className="font-bold text-sm text-gray-400 mb-4 flex items-center gap-2">
                      <Terminal size={14} /> System Logs
                  </h3>
                  <div className="space-y-2 h-40 overflow-y-auto custom-scrollbar">
                      {logs.map((log, i) => (
                          <div key={i} className={`truncate ${log.includes('ERROR') ? 'text-red-400' : log.includes('WARN') ? 'text-secondary' : 'text-gray-500'}`}>
                              <span className="opacity-50 mr-2">{new Date().toLocaleTimeString()}</span>
                              {log}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AdminPanel;