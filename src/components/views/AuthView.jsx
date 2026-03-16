import { useState } from 'react'
import { LogIn, UserPlus, Loader } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/utils'

/**
 * @intent Authentication gate — Login / Signup screen
 * @param None
 */
export default function AuthView() {
    const signIn = useAuthStore(s => s.signIn)
    const signUp = useAuthStore(s => s.signUp)

    const [mode, setMode] = useState('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [error, setError] = useState(null)
    const [busy, setBusy] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setBusy(true)
        try {
            if (mode === 'login') {
                await signIn(email, password)
            } else {
                await signUp(email, password, name)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm flex flex-col gap-8">
                {/* Brand */}
                <div className="text-center">
                    <h1 className="font-condensed font-black text-[48px] leading-none tracking-[-2px] text-white uppercase">
                        Stability<br/>OS
                    </h1>
                    <p className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mt-3">
                        State-Based Execution System
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border border-border">
                    <button
                        onClick={() => setMode('login')}
                        className={cn(
                            "flex-1 py-3 font-mono text-[10px] tracking-[2px] uppercase transition-colors",
                            mode === 'login' ? 'bg-surface text-white' : 'text-text3 hover:text-white'
                        )}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className={cn(
                            "flex-1 py-3 font-mono text-[10px] tracking-[2px] uppercase transition-colors border-l border-border",
                            mode === 'signup' ? 'bg-surface text-white' : 'text-text3 hover:text-white'
                        )}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
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
                        <div className="font-mono text-[10px] text-red border border-red p-2 bg-red-dim">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
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
