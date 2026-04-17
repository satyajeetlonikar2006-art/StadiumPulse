'use strict';

describe('Email + Password', () => {
  test('register success — returns token + user', () => {})
  test('register fails — duplicate email 409', () => {})
  test('register fails — weak password 400', () => {})
  test('register fails — missing name 400', () => {})
  test('login success — returns token + user', () => {})
  test('login fails — wrong password 401', () => {})
  test('login fails — unknown email 401', () => {})
  test('GET /me — authenticated returns user', () => {})
  test('GET /me — no token returns 401', () => {})
  test('PATCH /me — updates seat and language', () => {})
  test('POST /refresh — valid token returns new access token', () => {})
  test('POST /logout — invalidates refresh token', () => {})
})

describe('Magic Link', () => {
  test('POST /magic/send — valid email queues email send', () => {})
  test('POST /magic/send — invalid email 400', () => {})
  test('GET /magic/verify — valid token redirects with JWT', () => {})
  test('GET /magic/verify — expired token redirects with error', () => {})
  test('GET /magic/verify — already used token redirects with error', () => {})
  test('GET /magic/verify — unknown token redirects with error', () => {})
})

describe('Google OAuth', () => {
  test('GET /google — redirects to Google consent screen', () => {})
  test('GET /google/callback — creates new user on first login', () => {})
  test('GET /google/callback — merges with existing email account', () => {})
})
