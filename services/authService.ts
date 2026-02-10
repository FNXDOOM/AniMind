import { supabase } from './supabase';
import { User } from '../types';

export const signUp = async (email: string, password: string, username: string): Promise<{ user: User | null, error: any }> => {
  try {
    const avatar = `https://ui-avatars.com/api/?name=${username}&background=8b5cf6&color=fff&bold=true`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          avatar_url: avatar
        }
      }
    });

    if (error) return { user: null, error };
    
    if (data && data.user) {
      return {
        user: {
          id: data.user.id,
          username,
          avatar,
          email: data.user.email,
          isAdmin: false
        },
        error: null
      };
    }

    return { user: null, error: new Error('Sign up failed') };
  } catch (err) {
    console.error("SignUp exception:", err);
    return { user: null, error: err };
  }
};

export const signIn = async (email: string, password: string): Promise<{ user: User | null, error: any }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { user: null, error };

    if (data && data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_admin')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile during sign in:', profileError);
      }
      
      const username = profile?.username || data.user.user_metadata?.username || email.split('@')[0];
      const avatar = profile?.avatar_url || data.user.user_metadata?.avatar_url;
      const isAdmin = profile?.is_admin === true;

      return {
        user: {
          id: data.user.id,
          username,
          avatar,
          email: data.user.email,
          isAdmin
        },
        error: null
      };
    }

    return { user: null, error: new Error('Login failed') };
  } catch (err) {
    console.error("SignIn exception:", err);
    return { user: null, error: err };
  }
};

export const signOut = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("SignOut error:", error);
  }
};

export const deleteAccount = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        await supabase.from('profiles').delete().eq('id', session.user.id);
        await supabase.auth.signOut();
    }
  } catch (error) {
    console.error("Delete account error:", error);
    await supabase.auth.signOut();
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await supabase.auth.getSession();
    
    if (response.error) {
        return null;
    }
    
    if (!response.data || !response.data.session || !response.data.session.user) {
        return null;
    }

    const user = response.data.session.user;
    
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_admin')
        .eq('id', user.id)
        .single();
    
    if (profileError) {
      console.error('Error fetching profile in getCurrentUser:', profileError);
    }
    
    const username = profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'User';
    const avatar = profile?.avatar_url || user.user_metadata?.avatar_url;
    
    if (!profile) {
      console.warn('Profile not returned — check RLS or profile row');
    }

    const isAdmin = profile?.is_admin === true;
    
    return {
      id: user.id,
      username,
      avatar,
      email: user.email,
      isAdmin
    };
  } catch (error) {
    console.warn("Auth initialization failed:", error);
    return null;
  }
};

// --- PASSWORD RECOVERY ---

export const sendPasswordResetEmail = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  } catch (err) {
    return { error: err };
  }
};

export const verifyPasswordResetOtp = async (email: string, token: string) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

export const updateUserPassword = async (password: string) => {
  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// --- GOOGLE SIGN-IN (For existing users only) ---

export const signInWithGoogle = async (): Promise<{ error: any }> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}?mode=signin`,
      },
    });

    if (error) return { error };
    return { error: null };
  } catch (err) {
    console.error("Google Sign-In exception:", err);
    return { error: err };
  }
};

// --- GOOGLE SIGN-UP (Create new account) ---

export const signUpWithGoogle = async (): Promise<{ error: any }> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}?mode=signup`,
      },
    });

    if (error) return { error };
    return { error: null };
  } catch (err) {
    console.error("Google Sign-Up exception:", err);
    return { error: err };
  }
};

// --- HANDLE GOOGLE CALLBACK ---

export const handleGoogleCallback = async (): Promise<{ user: User | null, error: any }> => {
  try {
    // Get URL params to check mode
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode'); // 'signin' or 'signup'
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) return { user: null, error: sessionError };
    if (!session || !session.user) return { user: null, error: new Error('No session found') };

    const authUser = session.user;
    const email = authUser.email;

    if (!email) {
      await supabase.auth.signOut();
      return { user: null, error: new Error('Email not found in Google account') };
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_admin')
      .eq('id', authUser.id)
      .single();

    // SIGN-IN MODE: Profile must exist
    if (mode === 'signin') {
      if (profileError || !profile) {
        await supabase.auth.signOut();
        return { 
          user: null, 
          error: new Error('Account not found. Please sign up first.')
        };
      }

      // Profile exists - sign in successful
      return {
        user: {
          id: authUser.id,
          username: profile.username,
          avatar: profile.avatar_url,
          email,
          isAdmin: profile.is_admin === true
        },
        error: null
      };
    }

    // SIGN-UP MODE: Create profile if doesn't exist
    if (mode === 'signup') {
      // If profile already exists, just sign them in
      if (profile) {
        return {
          user: {
            id: authUser.id,
            username: profile.username,
            avatar: profile.avatar_url,
            email,
            isAdmin: profile.is_admin === true
          },
          error: null
        };
      }

      // Create new profile
      const username = authUser.user_metadata?.full_name || email.split('@')[0];
      const avatar = authUser.user_metadata?.avatar_url || 
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=8b5cf6&color=fff&bold=true`;

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          username,
          avatar_url: avatar,
          is_admin: false
        });

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        await supabase.auth.signOut();
        return { user: null, error: insertError };
      }

      return {
        user: {
          id: authUser.id,
          username,
          avatar,
          email,
          isAdmin: false
        },
        error: null
      };
    }

    // Unknown mode
    await supabase.auth.signOut();
    return { user: null, error: new Error('Invalid authentication mode') };

  } catch (err) {
    console.error("Google callback exception:", err);
    await supabase.auth.signOut();
    return { user: null, error: err };
  }
};