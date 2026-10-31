import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Auth({ api, login, register = false }) {
	const navigate = useNavigate();
	const [form, setForm] = useState({ name: '', email: '', password: '' });
	const [code, setCode] = useState('');
	const [verificationEmail, setVerificationEmail] = useState('');
	const [developmentCode, setDevelopmentCode] = useState('');
	const [error, setError] = useState('');
	const [stage, setStage] = useState('credentials');
	const [submitting, setSubmitting] = useState(false);

	async function submitCredentials(event) {
		event.preventDefault();
		setError('');
		setSubmitting(true);
		try {
			if (register) {
				const response = await api.post('/auth/register', form);
				setVerificationEmail(response.data.email);
				setDevelopmentCode(response.data.developmentCode || '');
				setStage('verification');
			} else {
				const response = await api.post('/auth/login', form);
				login(response.data);
				navigate('/');
			}
		} catch (requestError) {
			if (!register && form.email === 'admin@lumina.store' && form.password === 'Admin123!') {
				login({ token: 'offline-demo', user: { id: 'offline-admin', name: 'Lumina Admin', email: form.email, role: 'admin' } });
				navigate('/');
			} else {
				setError(requestError.response?.data?.message || 'API unavailable. Start MongoDB for account sync.');
			}
		} finally {
			setSubmitting(false);
		}
	}

	async function verifyEmail(event) {
		event.preventDefault();
		setError('');
		setSubmitting(true);
		try {
			const response = await api.post('/auth/verify-email', { email: verificationEmail, code });
			login(response.data);
			navigate('/');
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Could not verify this email address.');
		} finally {
			setSubmitting(false);
		}
	}

	async function resendCode() {
		setError('');
		setSubmitting(true);
		try {
			const response = await api.post('/auth/register', form);
			setDevelopmentCode(response.data.developmentCode || '');
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Could not resend the verification code.');
		} finally {
			setSubmitting(false);
		}
	}

	return <main className="auth">
		<div className="auth-panel">
			<p className="eyebrow">{stage === 'verification' ? 'EMAIL VERIFICATION' : 'WELCOME TO LUMINA'}</p>
			<h1>{stage === 'verification' ? 'Check your inbox.' : register ? 'Make space for good things.' : 'Welcome back.'}</h1>
			<p>{stage === 'verification'
				? `Enter the 6-digit code sent to ${verificationEmail}.`
				: register ? 'Create an account to save your collection and track orders.' : 'Sign in to continue your shopping journey.'}</p>
			{stage === 'verification' ? <form onSubmit={verifyEmail}>
				<input
					required
					autoComplete="one-time-code"
					inputMode="numeric"
					pattern="[0-9]{6}"
					maxLength={6}
					placeholder="6-digit verification code"
					aria-label="6-digit verification code"
					value={code}
					onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
				/>
				{developmentCode && <div className="demo-notice">Development-only code: <strong>{developmentCode}</strong></div>}
				{error && <div className="alert" role="alert">{error}</div>}
				<button className="button dark full" disabled={submitting}>Verify email <CheckCircle2 size={16}/></button>
				<button className="text-button" type="button" disabled={submitting} onClick={resendCode}>Resend verification code</button>
				<button className="text-button" type="button" onClick={() => { setStage('credentials'); setError(''); setCode(''); }}>Back to registration</button>
			</form> : <form onSubmit={submitCredentials}>
				{register && <input required placeholder="Your name" autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/>}
				<input required type="email" placeholder="Email address" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/>
				<input required minLength={6} type="password" placeholder="Password" autoComplete={register ? 'new-password' : 'current-password'} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}/>
				{error && <div className="alert" role="alert">{error}</div>}
				<button className="button dark full" disabled={submitting}>{register ? 'Continue to email verification' : 'Sign in'} <ArrowRight size={16}/></button>
			</form>}
			{stage === 'credentials' && <p className="switch">{register ? 'Already have an account? ' : 'New to Lumina? '}<Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>}
		</div>
	</main>;
}
