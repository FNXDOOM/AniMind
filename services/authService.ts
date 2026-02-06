import { supabase } from './supabase';
import { User } from '../types';

export const signUp = async (email: string, password: string, username: string): Promise<{ user: User | null, error: any }> => {
  try {
    const avatar = `https://ui-avatars.com/api/?name=${username}&background=8b5cf6&color=fff&bold=true`;

    // 1. Sign up the user with metadata
    // The Database Trigger 'on_auth_user_created' will automatically create the public.profiles row
    // using the data provided in the 'options.data' object.
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
      // Fetch profile to get role (is_admin) and other details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_admin')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile during sign in:', profileError);
      }
      
      
      // Prioritize profile data, fallback to metadata or defaults
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
    
    // Always fetch profile to ensure we have the latest is_admin status
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
    // Requires Supabase email template for token
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
