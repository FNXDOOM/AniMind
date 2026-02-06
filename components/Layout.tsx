import React, { useState } from 'react';
import { Menu, X, Home, Search, Heart, LogOut, Trash2, FolderOpen, ShieldAlert } from 'lucide-react';
import { ViewState, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  user: User;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, user, onLogout, onDeleteAccount }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: ViewState.HOME, label: 'Home', icon: <Home size={20} /> },
    { id: ViewState.SEARCH, label: 'Search', icon: <Search size={20} /> },
    { id: ViewState.WATCHLIST, label: 'My Watchlist', icon: <Heart size={20} /> },
    { id: ViewState.SHOWS, label: 'Shows', icon: <FolderOpen size={20} /> },
  ];

  if (user.isAdmin) {
      navItems.push({ id: ViewState.ADMIN, label: 'Admin Panel', icon: <ShieldAlert size={20} /> });
  }

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-xl font-bold text-white">AniMind<span className="text-primary">.</span></h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-surface/90 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:block flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8">
          <h1 className="text-2xl font-black text-white mb-10 tracking-tight">
            AniMind<span className="text-primary">.</span>
          </h1>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group font-medium
                  ${currentView === item.id 
                    ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <span className={currentView === item.id ? 'text-black' : 'text-gray-500 group-hover:text-white'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 space-y-4">
           {/* User Profile */}
           <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
              <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full border border-white/10" />
              <div className="overflow-hidden">
                 <p className="text-sm font-bold truncate text-white">{user.username}</p>
                 <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${user.isAdmin ? 'bg-secondary' : 'bg-green-500'} animate-pulse`}></span>
                    <p className="text-xs text-gray-400">{user.isAdmin ? 'Administrator' : 'Online'}</p>
                 </div>
              </div>
           </div>

           <button 
             onClick={onLogout}
             className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 py-2 rounded-lg transition-colors"
           >
              <LogOut size={16} /> Log Out
           </button>

           <button 
             onClick={onDeleteAccount}
             className="w-full flex items-center justify-center gap-2 text-xs text-red-500/60 hover:text-red-500 hover:bg-red-500/10 py-2 rounded-lg transition-colors"
           >
              <Trash2 size={14} /> Delete Account
           </button>
           
          <div className="text-xs text-center text-gray-600 pt-2 font-medium">
            <p>© 2024 AniMind</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-60px)] md:h-screen scroll-smooth bg-transparent">
        <div className="p-4 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;