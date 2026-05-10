import { supabase } from './lib/supabase';
async function run() {
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });
  console.log('Total questions:', count);
}
run();
