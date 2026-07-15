import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Hanya menerima method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { invoiceNumber, mode } = req.body;

  if (!invoiceNumber) {
    return res.status(400).json({ error: 'Invoice Number is required' });
  }

  // Inisialisasi Supabase menggunakan Service Role Key (Aman karena dijalankan di server)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    if (mode === 'new') {
      // Coba masukkan invoice baru dengan 25 token
      const { data, error } = await supabase
        .from('invoices')
        .insert([{ invoice_number: invoiceNumber, tokens: 25 }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Kode error duplicate unik di Postgres
          return res.status(400).json({ error: 'Invoice Number already Registered. Please login as an Existing Member.' });
        }
        throw error;
      }
      return res.status(200).json({ success: true, tokens: data.tokens });

    } else if (mode === 'existing') {
      // Cari invoice yang sudah ada
      const { data, error } = await supabase
        .from('invoices')
        .select('tokens')
        .eq('invoice_number', invoiceNumber)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Invoice Number not Found. Please Sign in as a New User.' });
      }
      return res.status(200).json({ success: true, tokens: data.tokens });
    }
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
