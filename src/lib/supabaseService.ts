import { supabase } from '$lib/supabase';

export const SupabaseService = {
  
  // Create a document in a specific table
  async createDocument(tableName: string, data: any) {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  // Get a document by table and document ID
  async getDocument(tableName: string, documentId: string) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get a user profile by user_id
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found, return null instead of throwing
        return null;
      }
      throw error;
    }
    return data;
  },

  // Update a document in a specific table
  async updateDocument(tableName: string, documentId: string, data: any) {
    const { data: result, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  // Update a user profile by user_id
  async updateUserProfile(userId: string, data: any) {
    const { data: result, error } = await supabase
      .from('user_profiles')
      .update(data)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  // Upsert (insert or update) a user profile
  async upsertUserProfile(userId: string, data: any) {
    const profileData = { ...data, user_id: userId };
    
    const { data: result, error } = await supabase
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  // Delete a document by table and document ID
  async deleteDocument(tableName: string, documentId: string) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', documentId);
    
    if (error) throw error;
    return { success: true };
  },

  // Upload a file to storage
  async uploadFile(file: File, bucket: string = 'photos') {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    return data;
  },

  // Delete a file by its file path
  async deleteFile(filePath: string, bucket: string = 'photos') {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) throw error;
    return { success: true };
  },

  // Get the current logged-in user's account
  async getAccount() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    return user;
  },

  // Log out the current user
  async logout() {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    return { success: true };
  },

  // Sign up a new user
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  // Sign in an existing user
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }
};