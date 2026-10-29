<?php

namespace App\Controllers\Api;

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

        $db->transBegin();
        try {
            $db->table('game_users')->insert([
                'username'      => $username,
                'email'         => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            ]);
            $db->table('game_progress')->insert(['user_id' => $db->insertID(), 'last_claim' => time()]);
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
