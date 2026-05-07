'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import './Withdraw.css';

export default function WithdrawPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    amount: '',
    method: 'DANA',
    accountName: '',
    accountNumber: ''
  });

  const KURS = 70;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setCurrentUser(profile);
    };
    getUser();
  }, [router]);

  const estimation = parseInt(form.amount) >= 200 ? parseInt(form.amount) * KURS : 0;

  const handleWithdraw = async () => {
    const amount = parseInt(form.amount);
    
    // 1. Validasi Input
    if (!amount || amount < 200) return showNotif("Minimal penarikan 200 koin!", "warning");
    if (!form.accountName || !form.accountNumber) return showNotif("Lengkapi data rekening!", "warning");
    if (!currentUser) return showNotif("Sesi berakhir, login ulang.", "error");
    if (currentUser.coins < amount) return showNotif("Saldo koin tidak cukup!", "error");

    setIsSubmitting(true);

    try {
      // 2. Potong Saldo (Atomic Update di Client Side Profile)
      const { error: uError } = await supabase
        .from('profiles')
        .update({ coins: currentUser.coins - amount })
        .eq('id', currentUser.id);

      if (uError) throw new Error("Gagal memproses saldo.");

      // 3. Simpan Request ke withdraw_requests
      const { error: iError } = await supabase
        .from('withdraw_requests')
        .insert({
          user_id: currentUser.id,
          amount: amount,
          method: form.method,
          account_name: form.accountName,
          account_number: form.accountNumber,
          status: 'pending'
        });

      if (iError) {
        // Rollback saldo jika insert gagal
        await supabase.from('profiles').update({ coins: currentUser.coins }).eq('id', currentUser.id);
        throw iError;
      }

      // 4. Trigger API Telegram (Lewat Route API Next.js lu)
      try {
        await fetch('/api/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amount,
            method: form.method,
            accountName: form.accountName,
            account: form.accountNumber,
            userId: currentUser.id
          })
        });
      } catch (teleErr) {
        console.error("Telegram API Error:", teleErr);
      }

      // 5. Kirim Notif Lonceng Internal
      await supabase.from('notifications').insert([{
        user_id: currentUser.id,
        type: 'withdraw',
        message: `Penarikan <b>${amount}</b> koin (Rp ${estimation.toLocaleString('id-ID')}) sedang diproses.`,
        is_read: false
      }]);

      showNotif("Permintaan terkirim!", "success");
      
      // Tunggu bentar terus pindah ke halaman saldo biar refresh
      setTimeout(() => {
        router.push('/saldo');
      }, 2000);

    } catch (err: any) {
      showNotif(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wd-page-wrapper">
      <header className="wd-header">
        <button className="wd-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>Tarik Koin</h2>
      </header>

      <div className="wd-form-group">
        <label>Jumlah Koin</label>
        <input 
          type="number" 
          placeholder="Min. 200" 
          value={form.amount}
          onChange={(e) => setForm({...form, amount: e.target.value})}
        />
        <div className="wd-estimation">
          Estimasi: Rp {estimation.toLocaleString('id-ID')}
        </div>
      </div>

      <div className="wd-form-group">
        <label>Metode Pembayaran</label>
        <select 
          value={form.method}
          onChange={(e) => setForm({...form, method: e.target.value})}
        >
          <option value="DANA">DANA</option>
          <option value="GOPAY">GOPAY</option>
          <option value="OVO">OVO</option>
          <option value="BANK_BCA">BANK BCA</option>
          <option value="BANK_MANDIRI">BANK MANDIRI</option>
        </select>
      </div>

      <div className="wd-form-group">
        <label>Nama Pemilik Rekening</label>
        <input 
          type="text" 
          placeholder="Nama sesuai ewallet/bank" 
          value={form.accountName}
          onChange={(e) => setForm({...form, accountName: e.target.value})}
        />
      </div>

      <div className="wd-form-group">
        <label>Nomor Rekening / HP</label>
        <input 
          type="text" 
          placeholder="08xxxx / 12345678" 
          value={form.accountNumber}
          onChange={(e) => setForm({...form, accountNumber: e.target.value})}
        />
      </div>

      <button 
        className="wd-submit-btn" 
        onClick={handleWithdraw}
        disabled={isSubmitting || !form.amount}
      >
        {isSubmitting ? 'Processing...' : 'Confirm Request'}
      </button>
    </div>
  );
}
