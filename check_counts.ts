import { supabasePublic as supabase } from './lib/supabase/public';
async function run() {
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });
  console.log('Total questions:', count);
}
run();
