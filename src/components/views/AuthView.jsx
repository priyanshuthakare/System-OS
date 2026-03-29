import { useState } from 'react'
import { LogIn, UserPlus, Loader, Mail, Chrome } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/utils'

/**
 * @intent Authentication gate — Login / Signup with email confirmation UX + Google OAuth
 * @param None
 */
export default function AuthView() {
    const signIn = useAuthStore(s => s.signIn)
    const signUp = useAuthStore(s => s.signUp)
    const signInWithGoogle = useAuthStore(s => s.signInWithGoogle)
    const needsEmailConfirmation = useAuthStore(s => s.needsEmailConfirmation)
    const pendingEmail = useAuthStore(s => s.pendingEmail)
    const clearConfirmationState = useAuthStore(s => s.clearConfirmationState)

    const [mode, setMode] = useState('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [error, setError] = useState(null)
    const [busy, setBusy] = useState(false)
    const [googleBusy, setGoogleBusy] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setBusy(true)
        try {
            if (mode === 'login') {
                await signIn(email, password)
            } else {
                await signUp(email, password, name)
                // If we get here without throwing, signUp handled state internally
                // (either confirmation required or auto-confirmed)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setError(null)
        setGoogleBusy(true)
        try {
            await signInWithGoogle()
            // Browser will redirect — no cleanup needed
        } catch (err) {
            setError(err.message)
            setGoogleBusy(false)
        }
    }

    // --- Email Confirmation Screen ---
    if (needsEmailConfirmation) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm flex flex-col gap-6">
                    {/* Icon */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-14 h-14 bg-surface border border-amber/30 flex items-center justify-center">
                            <Mail size={24} className="text-amber" />
                        </div>
                        <h1 className="font-condensed font-black text-[28px] text-white uppercase tracking-[-1px] text-center">
                            Confirm Your Email
                        </h1>
                    </div>

                    {/* Message */}
                    <div className="bg-surface border border-amber/20 p-5 flex flex-col gap-3">
                        <div className="font-mono text-[10px] tracking-[2px] text-amber uppercase">
                            VERIFICATION REQUIRED
                        </div>
                        <p className="font-body text-sm text-text2 leading-relaxed">
                            A confirmation link was sent to:
                        </p>
                        <div className="font-mono text-[11px] text-white bg-black border border-border px-3 py-2">
                            {pendingEmail}
                        </div>
                        <p className="font-body text-sm text-text2 leading-relaxed">
                            Click the link in your email to activate your account. Then return here and sign in.
                        </p>
                        <div className="border-t border-border pt-3">
                            <div className="font-mono text-[9px] text-text3 tracking-[1px] flex items-start gap-2">
                                <span className="text-amber shrink-0">!</span>
                                <span>Didn't receive it? Check your <strong className="text-white">spam or junk folder</strong>. It can take up to 2 minutes to arrive.</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                clearConfirmationState()
                                setMode('login')
                                setPassword('')
                            }}
                            className="w-full p-3 bg-amber text-black font-mono text-[11px] tracking-[2px] uppercase font-bold"
                        >
                            <LogIn size={13} className="inline mr-2" />
                            I Confirmed — Sign In Now
                        </button>
                        <button
                            onClick={clearConfirmationState}
                            className="font-mono text-[9px] text-text3 tracking-[1px] hover:text-white transition-colors text-center"
                        >
                            ← Use a different email
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // --- Main Auth Screen ---
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm flex flex-col gap-8">
                {/* Brand */}
                <div className="text-center">
                    <h1 className="font-condensed font-black text-[48px] leading-none tracking-[-2px] text-white uppercase">
                        Stability<br />OS
                    </h1>
                    <p className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mt-3">
                        State-Based Execution System
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border border-border">
                    <button
                        onClick={() => { setMode('login'); setError(null) }}
                        className={cn(
                            "flex-1 py-3 font-mono text-[10px] tracking-[2px] uppercase transition-colors",
                            mode === 'login' ? 'bg-surface text-white' : 'text-text3 hover:text-white'
                        )}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setMode('signup'); setError(null) }}
                        className={cn(
                            "flex-1 py-3 font-mono text-[10px] tracking-[2px] uppercase transition-colors border-l border-border",
                            mode === 'signup' ? 'bg-surface text-white' : 'text-text3 hover:text-white'
                        )}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Google OAuth Button */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={googleBusy || busy}
                    className="w-full flex items-center justify-center gap-3 p-3 bg-white text-black font-mono text-[11px] tracking-[1px] uppercase font-bold hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                    {googleBusy ? (
                        <Loader size={14} className="animate-spin" />
                    ) : (
                        <GoogleIcon />
                    )}
                    Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="font-mono text-[8px] text-text3 tracking-[2px] uppercase">or</span>
                    <div className="flex-1 h-px bg-border" />
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {mode === 'signup' && (
                        <input
                            type="text"
                            placeholder="Display Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-surface border border-border p-3 font-body text-sm text-white placeholder-text3 outline-none focus:border-amber transition-colors"
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-surface border border-border p-3 font-body text-sm text-white placeholder-text3 outline-none focus:border-amber transition-colors"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-surface border border-border p-3 font-body text-sm text-white placeholder-text3 outline-none focus:border-amber transition-colors"
                    />

                    {error && (
                        <div className="font-mono text-[10px] text-red border border-red p-2 bg-red/5 leading-relaxed">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={busy || googleBusy}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 p-3 font-mono text-[11px] tracking-[2px] uppercase transition-colors",
                            "bg-amber text-black font-bold hover:bg-amber/90 disabled:opacity-50"
                        )}
                    >
                        {busy ? (
                            <Loader size={14} className="animate-spin" />
                        ) : mode === 'login' ? (
                            <><LogIn size={14} /> Enter System</>
                        ) : (
                            <><UserPlus size={14} /> Initialize</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

/** @intent Inline Google SVG icon — avoids external image dep */
function GoogleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    )
}
