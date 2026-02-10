import React, { useState } from 'react';
import { ArrowRight, Mail, Lock, User as UserIcon, Loader2, KeyRound, ShieldCheck, ChevronLeft } from 'lucide-react';
import { sendPasswordResetEmail, verifyPasswordResetOtp, updateUserPassword, signInWithGoogle, signUpWithGoogle } from '../services/authService';
import { isValidEmail, validatePassword, validateUsername, RateLimiter } from '../utils/security';

interface LoginProps {
  onLogin: (email: string, password: string, username?: string, isSignUp?: boolean) => Promise<void>;
  loading?: boolean;
}

type LoginView = 'AUTH' | 'FORGOT_EMAIL' | 'FORGOT_OTP' | 'RESET_PASSWORD';

const loginRateLimiter = new RateLimiter(5, 60000);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Login: React.FC<LoginProps> = ({ onLogin, loading = false }) => {
  const [view, setView] = useState<LoginView>('AUTH');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);

  const clearState = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleGoogleAuth = async () => {
    clearState();
    setInternalLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await signUpWithGoogle();
        if (error) throw error;
      } else {
        const { error } = await signInWithGoogle();
        if (error) throw error;
      }
      // User will be redirected to Google
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
      setInternalLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();

    if (!email || !password) {
        setError('Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        setError('Please enter a valid email address');
        return;
    }

    if (isSignUp) {
        if (!username) {
            setError('Username is required for sign up');
            return;
        }

        const usernameValidation = validateUsername(username);
        if (!usernameValidation.isValid) {
            setError(usernameValidation.error || 'Invalid username');
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.error || 'Invalid password');
            return;
        }
    }

    if (!loginRateLimiter.canAttempt()) {
        const waitTime = Math.ceil(loginRateLimiter.getTimeUntilReset() / 1000);
        setError(`Too many login attempts. Please try again in ${waitTime} seconds.`);
        return;
    }
    
    loginRateLimiter.recordAttempt();

    try {
        await onLogin(email, password, isSignUp ? username : undefined, isSignUp);
    } catch (err: any) {
        setError(err.message || 'Authentication failed');
    }
  };

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      clearState();
      setInternalLoading(true);

      if (!email) {
          setError('Please enter your email address');
          setInternalLoading(false);
          return;
      }

      if (!isValidEmail(email)) {
          setError('Please enter a valid email address');
          setInternalLoading(false);
          return;
      }

      const { error } = await sendPasswordResetEmail(email);
      setInternalLoading(false);

      if (error) {
          setError(error.message || 'Failed to send reset code');
      } else {
          setView('FORGOT_OTP');
          setSuccessMsg(`Code sent to ${email}`);
      }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      clearState();
      setInternalLoading(true);

      if (!otp) {
          setError('Please enter the code');
          setInternalLoading(false);
          return;
      }

      if (otp.length !== 6) {
          setError('Code must be 6 digits');
          setInternalLoading(false);
          return;
      }

      const { error } = await verifyPasswordResetOtp(email, otp);
      setInternalLoading(false);

      if (error) {
          setError('Invalid code or expired link');
      } else {
          setView('RESET_PASSWORD');
          setSuccessMsg('Code verified. Set your new password.');
      }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      clearState();
      setInternalLoading(true);

      if (!newPassword) {
          setError('Please enter a new password');
          setInternalLoading(false);
          return;
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
          setError(passwordValidation.error || 'Invalid password');
          setInternalLoading(false);
          return;
      }

      const { error } = await updateUserPassword(newPassword);
      setInternalLoading(false);

      if (error) {
          setError(error.message || 'Failed to update password');
      } else {
          setSuccessMsg('Password updated successfully!');
          setTimeout(() => {
             setView('AUTH');
             setPassword('');
             setIsSignUp(false);
             clearState();
          }, 2000);
      }
  };

  const renderContent = () => {
      switch (view) {
          case 'AUTH':
              return (
                <>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {isSignUp && (
                        <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Username</label>
                        <div className="relative">
                            <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 pl-12 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                            placeholder="OtakuKing99"
                            maxLength={20}
                            />
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-1">3-20 characters, letters, numbers, and underscores only</p>
                        </div>
                    )}

                    <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Email</label>
                    <div className="relative">
                        <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 pl-12 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        placeholder="you@example.com"
                        autoComplete="email"
                        />
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    </div>
                    </div>

                    <div>
                    <div className="flex items-center justify-between mb-2 ml-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                        {!isSignUp && (
                            <button 
                                type="button"
                                onClick={() => { setView('FORGOT_EMAIL'); clearState(); }}
                                className="text-xs text-primary hover:text-white transition-colors"
                            >
                                Forgot Password?
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 pl-12 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        placeholder="••••••••"
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    </div>
                    {isSignUp && (
                        <p className="text-xs text-gray-500 mt-1 ml-1">Minimum 8 characters, one uppercase letter, one number</p>
                    )}
                    </div>

                    {error && <p className="text-red-400 text-sm mt-2 ml-1 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}
                    {successMsg && <p className="text-green-400 text-sm mt-2 ml-1 bg-green-500/10 p-2 rounded-lg border border-green-500/20">{successMsg}</p>}

                    <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-8"
                    >
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                            {isSignUp ? 'Create Account' : 'Sign In'}
                            <ArrowRight size={20} />
                        </>
                    )}
                    </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-surface/80 px-2 text-gray-400">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleAuth}
                  disabled={internalLoading || loading}
                  className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 border border-gray-200"
                >
                  {internalLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <GoogleIcon />
                      {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
                    </>
                  )}
                </button>
                </>
              );

          case 'FORGOT_EMAIL':
              return (
                  <form onSubmit={handleForgotEmailSubmit} className="space-y-6">
                      <div className="text-center mb-6">
                           <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary border border-primary/20">
                               <KeyRound size={32} />
                           </div>
                           <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
                           <p className="text-gray-300 text-sm">Enter your email to receive a verification code.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                        <div className="relative">
                            <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 pl-12 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                            placeholder="you@example.com"
                            autoComplete="email"
                            />
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        </div>
                      </div>

                      {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}

                      <button
                        type="submit"
                        disabled={internalLoading}
                        className="w-full bg-primary hover:bg-white hover:text-black disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                      >
                         {internalLoading ? <Loader2 className="animate-spin" /> : 'Send Reset Code'}
                      </button>

                      <button 
                        type="button"
                        onClick={() => { setView('AUTH'); clearState(); }}
                        className="w-full text-gray-400 hover:text-white py-2 text-sm flex items-center justify-center gap-2"
                      >
                         <ChevronLeft size={16} /> Back to Login
                      </button>
                  </form>
              );

          case 'FORGOT_OTP':
            return (
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div className="text-center mb-6">
                         <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary border border-primary/20">
                             <ShieldCheck size={32} />
                         </div>
                         <h2 className="text-2xl font-bold text-white mb-2">Verify Code</h2>
                         <p className="text-gray-300 text-sm">We sent a 6-digit code to <span className="text-white">{email}</span></p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Verification Code</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
                        placeholder="000000"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </div>

                    {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}
                    {successMsg && <p className="text-green-400 text-sm bg-green-500/10 p-2 rounded-lg border border-green-500/20">{successMsg}</p>}

                    <button
                      type="submit"
                      disabled={internalLoading}
                      className="w-full bg-primary hover:bg-white hover:text-black disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                       {internalLoading ? <Loader2 className="animate-spin" /> : 'Verify Code'}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => { setView('FORGOT_EMAIL'); setOtp(''); clearState(); }}
                        className="w-full text-gray-400 hover:text-white py-2 text-sm"
                      >
                         Resend Code?
                      </button>
                </form>
            );

        case 'RESET_PASSWORD':
            return (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
                    <div className="text-center mb-6">
                         <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary border border-primary/20">
                             <Lock size={32} />
                         </div>
                         <h2 className="text-2xl font-bold text-white mb-2">New Password</h2>
                         <p className="text-gray-300 text-sm">Enter your new secure password.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">New Password</label>
                      <div className="relative">
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 pl-12 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-1">Minimum 8 characters, one uppercase letter, one number</p>
                    </div>

                    {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}
                    {successMsg && <p className="text-green-400 text-sm bg-green-500/10 p-2 rounded-lg border border-green-500/20">{successMsg}</p>}

                    <button
                      type="submit"
                      disabled={internalLoading}
                      className="w-full bg-primary hover:bg-white hover:text-black disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                       {internalLoading ? <Loader2 className="animate-spin" /> : 'Update Password'}
                    </button>
                </form>
            );
      }
  };

  return (
    <div 
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans"
        style={{
            backgroundImage: 'linear-gradient(110deg, rgba(56, 189, 248, 0.15) 0%, rgba(250, 204, 21, 0.15) 100%)',
            backgroundSize: 'cover'
        }}
    >
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          {view === 'AUTH' && (
            <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight drop-shadow-md">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h1>
                <p className="text-gray-300 font-medium">
                    To <span className="text-primary font-bold">AniMind.</span>
                </p>
            </div>
          )}

          {renderContent()}

          {view === 'AUTH' && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;