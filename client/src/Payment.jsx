import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard } from 'lucide-react';
import './payment.css';

export default function Payment({ api, cart, onComplete }) {
	const location = useLocation();
	const navigate = useNavigate();
	const shipping = location.state?.shipping;
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

	useEffect(() => {
		if (!shipping || !cart.length) navigate(cart.length ? '/checkout' : '/cart', { replace: true });
	}, [cart.length, navigate, shipping]);

	if (!shipping || !cart.length) return null;

	async function simulatePayment() {
		setError('');
		setSubmitting(true);
		try {
			await api.post('/orders', { shipping, paymentMethod: 'demo' });
			onComplete();
			navigate('/orders?success=1');
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Could not complete the demo payment.');
		} finally {
			setSubmitting(false);
		}
	}

	return <main className="checkout payment-page">
		<div className="page-title">
			<p className="eyebrow">DEMO PAYMENT</p>
			<h1>Review &amp; pay.</h1>
			<p className="demo-notice">This is a simulated checkout. No real payment is taken and no card details are requested.</p>
		</div>
		<div className="checkout-layout">
			<section className="checkout-form">
				<h2>Demo card</h2>
				<div className="demo-card">
					<div className="demo-card-top"><span>lumina<span className="brand-dot">.</span></span><CreditCard size={22}/></div>
					<div className="demo-card-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; DEMO</div>
					<div className="demo-card-bottom"><span>SIMULATED PAYMENT</span><strong>NO REAL CARD</strong></div>
				</div>
				<p className="payment-copy">Continue to create an order marked as simulated. This demo does not connect to a bank or payment processor.</p>
				{error && <div className="alert" role="alert">{error}</div>}
				<button className="button dark full" onClick={simulatePayment} disabled={submitting}>
					{submitting ? 'Simulating payment…' : `Simulate payment · $${total.toFixed(2)}`} <CheckCircle2 size={16}/>
				</button>
				<button className="text-button" onClick={() => navigate('/checkout', { state: { shipping } })}><ArrowLeft size={15}/> Back to shipping</button>
			</section>
			<aside className="summary">
				<h2>Order summary</h2>
				{cart.map(item => <div className="mini-item" key={item.product._id}>
					<img src={item.product.image} alt=""/>
					<span>{item.product.name} × {item.quantity}</span>
					<strong>${(item.product.price * item.quantity).toFixed(2)}</strong>
				</div>)}
				<hr/>
				<div className="total"><span>Total (demo)</span><strong>${total.toFixed(2)}</strong></div>
			</aside>
		</div>
	</main>;
}
