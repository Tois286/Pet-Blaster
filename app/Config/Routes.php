<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    $routes->post('register', 'AuthApi::register');
    $routes->post('login', 'AuthApi::login');
    $routes->post('logout', 'AuthApi::logout');
    $routes->get('profile', 'GameApi::profile');
    $routes->post('upgrade', 'GameApi::upgrade');
    $routes->post('battle/start', 'GameApi::battleStart');
    $routes->post('battle/finish', 'GameApi::battleFinish');
    $routes->post('afk/claim', 'GameApi::afkClaim');
});
