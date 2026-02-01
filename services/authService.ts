import { supabase } from './supabase';
import { User } from '../types';


export const signUp = async (email: string, password: string, username: string): Promise<{ user: User | null, error: any }> => {
  try {
    const avatar = `https://ui-avatars.com/api/?name=${username}&background=8b5cf6&color=fff&bold=true`;

    // 1. Sign up the user with metadata
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
      // 2. Create a profile entry (Database backup)

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

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { user: null, error };

    if (data && data.user) {
      // Try to get from metadata first (fastest)
      let username = data.user.user_metadata?.username;
      let avatar = data.user.user_metadata?.avatar_url;

      // If missing, fetch from profile
      if (!username) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', data.user.id)
          .single();
        
        if (profile) {
            username = profile.username;
            avatar = profile.avatar_url;
        }
      }

      return {
        user: {
          id: data.user.id,
          username: username || email.split('@')[0], // Ultimate fallback
          avatar: avatar,
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
        // Attempt to delete profile row. RLS policies must allow this.
        await supabase.from('profiles').delete().eq('id', session.user.id);
        await supabase.auth.signOut();
    }
  } catch (error) {
    console.error("Delete account error:", error);
    // Force signout just in case
    await supabase.auth.signOut();
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  
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
    
    let username = user.user_metadata?.username;
    let avatar = user.user_metadata?.avatar_url;

    if (!username) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();
        
        if (profile) {
            username = profile.username;
            avatar = profile.avatar_url;
        } else if (profileError) {
             console.warn("Profile fetch warning:", profileError.message);
        }
    }

    return {
      id: user.id,
      username: username || user.email?.split('@')[0] || 'User',
      avatar: avatar,
      email: user.email
    };
  } catch (error) {
    console.warn("Auth initialization failed (Network error or invalid Supabase URL):", error);
    return null;
  }
};