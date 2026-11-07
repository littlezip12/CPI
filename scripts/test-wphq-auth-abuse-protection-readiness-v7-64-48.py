#!/usr/bin/env python3
from pathlib import Path
import json,sys,re
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def read(rel): return (ROOT/rel).read_text(encoding='utf-8',errors='ignore')
def load(rel): return json.loads(read(rel))
site=load('config/site-release.json'); pkg=load('package.json'); contract=load('mobile/app-contract.json')
req(site.get('version')=='7.64.48','site release must be 7.64.47')
req(pkg.get('version')=='7.64.48','package release must be 7.64.47')
req(contract.get('release')=='7.64.48','mobile contract release must be 7.64.47')
req(site.get('authAbuseProtectionReadinessRelease')=='7.64.47','auth abuse-protection release marker missing')
req(site.get('authTurnstileFrontendReadinessRelease')=='7.64.47','Turnstile frontend readiness marker missing')
req(site.get('authAnonymousGuestCaptchaReadinessRelease')=='7.64.47','Guest Scorer CAPTCHA readiness marker missing')
req(site.get('authTurnstileActivationStatus')=='frontend_ready_not_activated','CAPTCHA must remain explicitly not activated')
config=read('config/live-sandbox.js')
for token in ['turnstileSiteKey: ""','authAbuseProtectionProvider: "turnstile"','authAbuseProtectionStatus: "frontend_ready_not_activated"']:
    req(token in config,f'live config missing {token}')
req('secret key belongs only in Supabase Auth' in config,'config must warn that Turnstile secret never belongs in repo')
login_html=read('live-login.html'); login_js=read('js/live-login-v7-64-47.js')
req('js/live-login-v7-64-47.js?v=7.64.47' in login_html,'login page not wired to 7.64.47 auth client')
req('>Log in<' in login_html and '>Create account<' in login_html,'password-first login/create-account toggle must remain visible')
req('Email me a sign-in link instead' in login_html,'secondary Magic Link control must remain available')
req('minlength="12"' in login_html,'12-character signup minimum must remain in the shell')
req('config/live-sandbox.js?v=7.64.47' in login_html,'login config cache-bust missing')
for token in ['turnstileConfigured','requireCaptcha','window.turnstile.render','options.captchaToken = captchaToken','signInWithOtp','resetPasswordForEmail','backend.client.auth.signUp({ email, password, options })','data = await backend.signIn(email, password)','shouldCreateUser: false','nativeRedirectForAuth()','nativeAuth().prepareRedirect(followingTarget())','signupAllowed = true']:
    req(token in login_js,f'login Turnstile readiness missing {token}')
req('if (!requireCaptcha("creating your account")) return;' in login_js,'signup must gate on configured Turnstile')
req('if (!requireCaptcha("requesting a one-time sign-in link")) return;' in login_js,'magic link must gate on configured Turnstile')
req('if (!requireCaptcha("requesting a password reset")) return;' in login_js,'password reset must gate on configured Turnstile')
req('shouldCreateUser: true' not in login_js,'secondary Magic Link must not create accounts')
req('passwordlessSupporter' not in login_js,'supporter flow must remain password-first')
handoff_html=read('live-scorer-handoff.html'); handoff_js=read('js/live-scorer-handoff-v7-64-47.js')
for token in ['id="handoffTurnstile"','id="handoffTurnstileHelp"','js/live-scorer-handoff-v7-64-47.js?v=7.64.47','config/live-sandbox.js?v=7.64.47']:
    req(token in handoff_html,f'Guest Scorer shell missing {token}')
for token in ['signInAnonymously({ options })','options.captchaToken = captchaToken','beginTurnstileGuestSession','turnstileConfigured','window.turnstile.render']:
    req(token in handoff_js,f'Guest Scorer CAPTCHA readiness missing {token}')
req('if (turnstileConfigured())' in handoff_js and 'session = await createAnonymousSession();' in handoff_js,'Guest Scorer must preserve no-site-key fallback')
readiness=read('WPHQ_7.64.47_AUTH_ABUSE_PROTECTION_READINESS.md')
for token in ['Do **not** enable project-level CAPTCHA first','Leaked Password Protection','Anonymous authentication remains enabled','waterpolohq://auth/callback','No Supabase SQL migration']:
    req(token in readiness,f'activation runbook missing {token}')
# No secret-looking Turnstile key should be committed in the new readiness assets.
for rel in ['config/live-sandbox.js','WPHQ_7.64.47_AUTH_ABUSE_PROTECTION_READINESS.md','js/live-login-v7-64-47.js','js/live-scorer-handoff-v7-64-47.js']:
    txt=read(rel)
    req('CLOUDFLARE_SECRET' not in txt and 'turnstileSecretKey' not in txt,f'secret-key field must not be committed: {rel}')
if errors:
    print('WPHQ 7.64.47 AUTH ABUSE-PROTECTION READINESS TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.47 AUTH ABUSE-PROTECTION READINESS TEST PASSED')
print(' - permanent signup / magic-link / reset flows are Turnstile-token ready')
print(' - anonymous Guest Scorer session creation is Turnstile-token ready')
print(' - site key remains blank so existing auth behavior is unchanged until deliberate activation')
print(' - no Turnstile secret is stored in the repository')
