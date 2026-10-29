<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;

abstract class ApiController extends BaseController
{
    protected function respond(array $data, int $status = 200)
    {
        return $this->response->setStatusCode($status)->setJSON($data);
    }

    protected function fail(string $message, int $status = 422)
    {
        return $this->respond(['success' => false, 'message' => $message], $status);
    }

    protected function body(): array
    {
        try {
            $json = $this->request->getJSON(true);
        } catch (\Throwable $e) {
            return [];
        }
        return is_array($json) ? $json : [];
    }

    protected function userId(): ?int
    {
        $id = session()->get('game_user_id');
        return $id ? (int) $id : null;
    }
}
