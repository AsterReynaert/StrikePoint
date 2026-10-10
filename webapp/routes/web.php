<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('write-option', 'write-option')->name('write-option');
});

Route::get('/test', function () {
    return Inertia::render('test');
});

require __DIR__.'/settings.php';
