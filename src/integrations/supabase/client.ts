// Stub to remove Supabase dependency without breaking all imports immediately
export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    signInWithPassword: async () => ({ error: new Error("Supabase removed. Please use Directus Auth.") }),
    signUp: async () => ({ error: new Error("Supabase removed.") }),
    signOut: async () => { },
    resetPasswordForEmail: async () => ({ error: new Error("Supabase removed.") }),
    updateUser: async () => ({ error: new Error("Supabase removed.") }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
      }),
      order: () => ({
        range: async () => ({ data: [], error: null }),
      }),
    }),
    insert: async () => ({ data: null, error: new Error("Supabase removed.") }),
    update: async () => ({ data: null, error: new Error("Supabase removed.") }),
    delete: async () => ({ error: new Error("Supabase removed.") }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ error: new Error("Supabase removed.") }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
} as any;