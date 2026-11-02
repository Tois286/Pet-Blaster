<?php

namespace App\Controllers\Api;

use App\Libraries\PublicId;

class AuthApi extends ApiController
{
    public function register()
    {
        $d = $this->body();
        $username = trim((string) ($d['username'] ?? ''));
        $email    = trim((string) ($d['email'] ?? ''));
        $password = $d['password'] ?? '';

        if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)
            || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || !is_string($password) || strlen($password) < 8 || strlen($password) > 72) {
            return $this->fail('Data tidak valid. Username 3-30 karakter, kata sandi 8-72 karakter.');
        }

        $db = db_connect();
        $exists = $db->table('game_users')->groupStart()->where('username', $username)
            ->orWhere('email', $email)->groupEnd()->countAllResults();
        if ($exists > 0) {
            return $this->fail('Username/email sudah digunakan.', 409);
        }

        $hasPublicId = PublicId::ensureColumn($db);   // sebelum transaksi: ALTER TABLE meng-commit otomatis
        $db->transBegin();
        try {
            $db->table('game_users')->insert([
                'username'      => $username,
                'email'         => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            ]);
            $uid = (int) $db->insertID();
            if ($hasPublicId) {
                // ID 10 karakter dari nomor urut akun + tanggal/jam pendaftaran (created_at yang baru saja dicatat database)
                $created = $db->query('SELECT created_at FROM game_users WHERE id = ?', [$uid])->getRowArray();
                $db->query('UPDATE game_users SET public_id = ? WHERE id = ?', [PublicId::make($uid, (string) ($created['created_at'] ?? '')), $uid]);
            }
            $db->table('game_progress')->insert(['user_id' => $uid, 'last_claim' => time()]);
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Gagal menyimpan akun.');
            }
            $db->transCommit();
            return $this->respond(['success' => true, 'message' => 'Akun berhasil dibuat.'], 201);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Registrasi gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Registrasi gagal.', 500);
        }
    }

    public function login()
    {
        // Batasi percobaan login: 10 kali per menit per IP.
        if (!service('throttler')->check('login_' . md5($this->request->getIPAddress()), 10, MINUTE)) {
            return $this->fail('Terlalu banyak percobaan. Coba lagi sebentar.', 429);
        }
        $d = $this->body();
        $identity = trim((string) ($d['identity'] ?? ''));
        $password = $d['password'] ?? '';
        if ($identity === '' || !is_string($password) || $password === '') {
            return $this->fail('Lengkapi login.');
        }

        $user = db_connect()->table('game_users')->groupStart()->where('username', $identity)
            ->orWhere('email', $identity)->groupEnd()->get()->getRowArray();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            return $this->fail('Login tidak valid.', 401);
        }

        session()->regenerate(true);
        session()->set('game_user_id', (int) $user['id']);
        return $this->respond(['success' => true, 'username' => $user['username']]);
    }

    public function logout()
    {
        session()->remove('game_user_id');
        session()->regenerate(true);
        return $this->respond(['success' => true]);
    }
}
