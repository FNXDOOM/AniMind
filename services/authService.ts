import { supabase } from './supabase';
import { User } from '../types';

const DEV_USER_KEY = 'animind_dev_user';
const DEV_USER: User = {
  id: 'dev-user-id',
  username: 'DevUser',
  avatar: 'https://ui-avatars.com/api/?name=Dev+User&background=10b981&color=fff&bold=true',
  email: 'demo@example.com'
};

export const signUp = async (email: string, password: string, username: string): Promise<{ user: User | null, error: any }> => {
  try {
    // 1. Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return { user: null, error };
    
    if (data && data.user) {
      // 2. Create a profile entry
      const avatar = `https://ui-avatars.com/api/?name=${username}&background=8b5cf6&color=fff&bold=true`;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { id: data.user.id, username, avatar_url: avatar }
        ]);

      if (profileError) {
          console.error("Error creating profile:", profileError);
      }

      return {
        user: {
          id: data.user.id,
          username,
          avatar,
          email: data.user.email
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
  // --- DEV BYPASS ---
  if (email === 'demo@example.com' && password === 'password') {
    localStorage.setItem(DEV_USER_KEY, JSON.stringify(DEV_USER));
    return { user: DEV_USER, error: null };
  }
  // ------------------

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { user: null, error };

    if (data && data.user) {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', data.user.id)
        .single();

      return {
        user: {
          id: data.user.id,
          username: profile?.username || email.split('@')[0],
          avatar: profile?.avatar_url,
          email: data.user.email
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
  // Clear Dev User
  localStorage.removeItem(DEV_USER_KEY);
  
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("SignOut error:", error);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  // --- DEV BYPASS CHECK ---
  const devUser = localStorage.getItem(DEV_USER_KEY);
  if (devUser) {
    return JSON.parse(devUser);
  }
  // ------------------------

  try {
    const response = await supabase.auth.getSession();
    
    // Check for errors or missing data before destructuring
    if (response.error) {
        return null;
    }
    
    if (!response.data || !response.data.session || !response.data.session.user) {
        return null;
    }

    const user = response.data.session.user;

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
    
    if (profileError) {
        console.warn("Profile fetch warning:", profileError.message);
    }

    return {
      id: user.id,
      username: profile?.username || user.email?.split('@')[0] || 'User',
      avatar: profile?.avatar_url,
      email: user.email
    };
  } catch (error) {
    console.warn("Auth initialization failed (Network error or invalid Supabase URL):", error);
    return null;
  }
};