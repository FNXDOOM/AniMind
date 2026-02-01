import React, { useState } from 'react';
import { Sparkles, ArrowRight, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string, username?: string, isSignUp?: boolean) => Promise<void>;
  loading?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, loading = false }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
        setError('Please fill in all fields');
        return;
    }
    if (isSignUp && !username) {
        setError('Username is required for sign up');
        return;
    }
    
    try {
        await onLogin(email, password, isSignUp ? username : undefined, isSignUp);
    } catch (err: any) {
        setError(err.message || 'Authentication failed');
    }
  };



  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-surface border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-gray-400">
                To <span className="text-primary font-bold">AniMind.</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isSignUp && (
                <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Username</label>
                <div className="relative">
                    <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-xl px-5 py-3 pl-12 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    placeholder="OtakuKing99"
                    />
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                </div>
                </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl px-5 py-3 pl-12 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  placeholder="you@example.com"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl px-5 py-3 pl-12 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mt-2 ml-1 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-8"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight size={20} />
                  </>
              )}
            </button>
          </form>


          <div className="mt-8 text-center">
            <button 
                onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                }}
                className="text-sm text-gray-400 hover:text-primary transition-colors"
            >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;