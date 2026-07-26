import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase credentials missing in server environment.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('hierarchy_data')
      .select('data')
      .eq('id', 9)
      .single();

    if (error) throw error;
    
    const logs = data?.data || [];
    const targetMonth = req.query.month; 
    
    let filtered = logs;
    if (targetMonth) {
      const start = `${targetMonth}-01`;
      const end = `${targetMonth}-31`;
      filtered = logs.filter(l => l.date >= start && l.date <= end);
    }
    
    const slim = filtered.map(l => ({
      plant: l.plant,
      created_on: l.created_on,
      remarks: l.remarks,
      date: l.date
    }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ data: slim });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
