<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('write-option', 'write-option')->name('write-option');
    Route::inertia('buy-option', 'buy-option')->name('buy-option');
});

require __DIR__.'/settings.php';
