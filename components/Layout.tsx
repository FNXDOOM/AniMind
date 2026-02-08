import React, { useState } from 'react';
import { Menu, X, Home, Search, Heart, FolderOpen, ShieldAlert, LogOut, Trash2, ChevronDown } from 'lucide-react';
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navItems = [
    { id: ViewState.HOME, label: 'Home', icon: <Home size={18} /> },
    { id: ViewState.SEARCH, label: 'Search', icon: <Search size={18} /> },
    { id: ViewState.WATCHLIST, label: 'Watchlist', icon: <Heart size={18} /> },
    { id: ViewState.SHOWS, label: 'Shows', icon: <FolderOpen size={18} /> },
  ];

  if (user.isAdmin) {
      navItems.push({ id: ViewState.ADMIN, label: 'Admin', icon: <ShieldAlert size={18} /> });
  }

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary selection:text-black flex flex-col">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-[100] bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 supports-[backdrop-filter]:bg-[#0a0a0a]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            
            {/* Left: Logo & Nav */}
            <div className="flex items-center gap-12">
              {/* Logo */}
              <div 
                className="flex-shrink-0 cursor-pointer group" 
                onClick={() => onChangeView(ViewState.HOME)}
              >
                <div className="flex items-center gap-1">
                   <div className="w-10 h-10 bg-white text-black rounded-lg flex items-center justify-center font-black text-2xl tracking-tighter group-hover:scale-105 transition-transform duration-300">
                     A<span className="text-primary">.</span>
                   </div>
                   <span className="font-bold text-xl tracking-tight hidden lg:block group-hover:text-primary transition-colors">AniMind</span>
                </div>
              </div>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onChangeView(item.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                      ${currentView === item.id 
                        ? 'text-white bg-white/10' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'}
                    `}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: User Profile */}
            <div className="hidden md:flex items-center gap-4">
               {/* User Menu Dropdown */}
               <div className="relative ml-3">
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    onBlur={() => setTimeout(() => setIsProfileOpen(false), 200)}
                    className="flex items-center gap-3 focus:outline-none group"
                  >
                     <div className="text-right hidden lg:block">
                        <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{user.username}</div>
                     </div>
                     <div className="relative">
                        <img 
                            className="h-10 w-10 rounded-full border-2 border-transparent group-hover:border-primary transition-all object-cover bg-surface" 
                            src={user.avatar} 
                            alt="" 
                        />
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${user.isAdmin ? 'bg-secondary' : 'bg-green-500'}`}></div>
                     </div>
                     <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <div className={`absolute right-0 mt-3 w-60 bg-[#121212] border border-white/10 rounded-xl shadow-2xl py-2 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top-right ${isProfileOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                      <div className="px-4 py-3 border-b border-white/5 mb-2">
                        <p className="text-sm text-gray-400">Signed in as</p>
                        <p className="text-sm font-bold text-white truncate">{user.email}</p>
                      </div>
                      
                      <button onClick={onLogout} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors">
                          <LogOut size={16} /> Sign out
                      </button>
                      
                      <button onClick={onDeleteAccount} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors">
                          <Trash2 size={16} /> Delete Account
                      </button>
                      
                      <div className="mt-2 pt-2 border-t border-white/5 px-4 py-2">
                          <p className="text-[10px] text-center text-gray-600 font-medium">© 2024 AniMind</p>
                      </div>
                  </div>
               </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10 focus:outline-none"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden bg-surface border-b border-white/5 overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pt-2 pb-6 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-4 rounded-lg text-base font-medium transition-colors
                  ${currentView === item.id 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                `}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            
            <div className="border-t border-white/5 my-4 pt-4">
               <div className="flex items-center gap-3 px-3 mb-4">
                  <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                  <div>
                    <div className="text-base font-medium text-white">{user.username}</div>
                    <div className="text-sm font-medium text-gray-400">{user.email}</div>
                  </div>
               </div>
               <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-300 hover:bg-white/5 hover:text-white"
               >
                  <LogOut size={18} /> Sign out
               </button>
               <button 
                 onClick={onDeleteAccount}
                 className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-red-400 hover:bg-red-500/10"
               >
                  <Trash2 size={18} /> Delete Account
               </button>
               <div className="text-center py-4 text-xs text-gray-600">
                  © 2024 AniMind
               </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
};

export default Layout;