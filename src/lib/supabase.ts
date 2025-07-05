import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gyyzmecfszokyaawocld.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5eXptZWNmc3pva3lhYXdvY2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MjcwOTksImV4cCI6MjA2NzIwMzA5OX0.Nd82FCeKUSBd3pgJMUisd5jz4sfsL-15c1mFJeW_iEM'

export const supabase = createClient(supabaseUrl, supabaseKey)