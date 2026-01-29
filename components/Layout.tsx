import React, { useState } from 'react';
import { Menu, X, Home, Search, Heart, Sparkles } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: ViewState.HOME, label: 'Home', icon: <Home size={20} /> },
    { id: ViewState.SEARCH, label: 'Search', icon: <Search size={20} /> },
    { id: ViewState.WATCHLIST, label: 'My Watchlist', icon: <Heart size={20} /> },
  ];

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">AniMind</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-surface/90 border-r border-white/5 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:block backdrop-blur-lg
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent mb-8 hidden md:block">
            AniMind
          </h1>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${currentView === item.id 
                    ? 'bg-primary/20 text-primary font-medium' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <span className={currentView === item.id ? 'text-primary' : 'text-gray-500 group-hover:text-white'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 text-xs text-gray-500 border-t border-white/5">
          <p>© 2024 AniMind</p>
          <p className="mt-1">Powered by AniList</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-60px)] md:h-screen scroll-smooth">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;