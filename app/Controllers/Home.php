<?php

namespace App\Controllers;

use CodeIgniter\HTTP\RedirectResponse;

class Home extends BaseController
{
    // Halaman utama langsung mengarah ke game (public/game/index.html).
    public function index(): RedirectResponse
    {
        return redirect()->to('/game/');
    }
}
