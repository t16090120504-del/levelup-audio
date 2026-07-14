import { createClient } from '@supabase/supabase-js';
const s = createClient('https://ihfaoksiurmucryfzfvd.supabase.co', 'sb_publishable_cLvmBr7GYj_BUh7gmwvg0g_ZmiBg6va');
s.from('genres').select('*').then(({data}) => {
  data!.forEach((g: any) => console.log(g.slug, '|', g.name, '|', g.id));
});
