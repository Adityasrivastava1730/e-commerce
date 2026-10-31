import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { User, Product, Cart, Order, EmailVerification } from './models.js';

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const verificationLifetime = 10 * 60 * 1000;
const verificationCooldown = 60 * 1000;
const maxVerificationAttempts = 5;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

const token = user => jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '7d' });

const auth = async (req, res, next) => {
	try {
		const data = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), jwtSecret);
		req.user = await User.findById(data.id);
		if (!req.user) throw new Error('User not found.');
		next();
	} catch {
		res.status(401).json({ message: 'Please sign in to continue.' });
	}
};

const admin = (req, res, next) => req.user?.role === 'admin'
	? next()
	: res.status(403).json({ message: 'Admin access required.' });

function createMailTransport() {
	const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
	if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !process.env.SMTP_FROM) return null;
	return nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT),
		secure: Number(SMTP_PORT) === 465,
		auth: { user: SMTP_USER, pass: SMTP_PASS }
	});
}

async function deliverVerificationCode(email, code) {
	const transport = createMailTransport();
	if (!transport) {
		if (process.env.NODE_ENV !== 'production' && process.env.OTP_DEV_MODE === 'true') return false;
		throw new Error('Email verification is not configured. Set the SMTP environment variables.');
	}
	await transport.sendMail({
		from: process.env.SMTP_FROM,
		to: email,
		subject: 'Your Lumina verification code',
		text: `Your Lumina verification code is ${code}. It expires in 10 minutes.`,
		html: `<p>Your Lumina verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
	});
	return true;
}

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/auth/register', async (req, res) => {
	try {
		const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
		const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
		const password = typeof req.body.password === 'string' ? req.body.password : '';
		if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
			return res.status(400).json({ message: 'Name, a valid email and a 6+ character password are required.' });
		}
		if (await User.exists({ email })) return res.status(409).json({ message: 'Email is already registered.' });

		const previous = await EmailVerification.findOne({ email });
		if (previous && Date.now() - previous.lastSentAt.getTime() < verificationCooldown) {
			return res.status(429).json({ message: 'Please wait a minute before requesting another verification code.' });
		}

		const code = crypto.randomInt(100000, 1000000).toString();
		const pending = await EmailVerification.findOneAndUpdate(
			{ email },
			{
				name,
				password: await bcrypt.hash(password, 10),
				codeHash: await bcrypt.hash(code, 10),
				expiresAt: new Date(Date.now() + verificationLifetime),
				lastSentAt: new Date(),
				attempts: 0
			},
			{ upsert: true, new: true, runValidators: true }
		);

		try {
			const delivered = await deliverVerificationCode(email, code);
			const response = {
				message: 'A verification code has been sent to your email address.',
				email: pending.email
			};
			if (!delivered) response.developmentCode = code;
			return res.status(202).json(response);
		} catch (error) {
			await EmailVerification.deleteOne({ _id: pending._id });
			console.error('Verification email delivery failed:', error.message);
			return res.status(503).json({ message: 'Could not send the verification email. Check the email service configuration and try again.' });
		}
	} catch (error) {
		console.error('Registration failed:', error.message);
		return res.status(500).json({ message: 'Could not start registration.' });
	}
});

app.post('/api/auth/verify-email', async (req, res) => {
	try {
		const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
		const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
			return res.status(400).json({ message: 'Enter the email address and 6-digit verification code.' });
		}

		const pending = await EmailVerification.findOne({ email });
		if (!pending || pending.expiresAt <= new Date()) {
			if (pending) await EmailVerification.deleteOne({ _id: pending._id });
			return res.status(400).json({ message: 'This verification code has expired. Please register again.' });
		}
		if (pending.attempts >= maxVerificationAttempts) {
			await EmailVerification.deleteOne({ _id: pending._id });
			return res.status(429).json({ message: 'Too many incorrect codes. Please register again.' });
		}
		if (!(await bcrypt.compare(code, pending.codeHash))) {
			pending.attempts += 1;
			await pending.save();
			return res.status(400).json({ message: 'That verification code is incorrect.' });
		}

		const user = await User.create({
			name: pending.name,
			email: pending.email,
			password: pending.password
		});
		await EmailVerification.deleteOne({ _id: pending._id });
		res.status(201).json({
			token: token(user),
			user: { id: user._id, name: user.name, email: user.email, role: user.role }
		});
	} catch (error) {
		if (error.code === 11000) return res.status(409).json({ message: 'Email is already registered.' });
		console.error('Email verification failed:', error.message);
		res.status(500).json({ message: 'Could not verify this email address.' });
	}
});

app.post('/api/auth/login', async (req, res) => {
	const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
	const user = await User.findOne({ email });
	if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) {
		return res.status(401).json({ message: 'Invalid email or password.' });
	}
	res.json({ token: token(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/auth/me', auth, (req, res) => res.json({
	id: req.user._id,
	name: req.user.name,
	email: req.user.email,
	role: req.user.role,
	address: req.user.address
}));

app.get('/api/products', async (req, res) => {
	const { search, category, sort } = req.query;
	const query = {};
	if (search) query.$or = [{ name: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
	if (category && category !== 'All') query.category = category;
	const sortMap = { priceLow: { price: 1 }, priceHigh: { price: -1 }, rating: { rating: -1 }, newest: { createdAt: -1 } };
	res.json(await Product.find(query).sort(sortMap[sort] || { featured: -1, createdAt: -1 }));
});

app.get('/api/products/:id', async (req, res) => {
	const product = await Product.findById(req.params.id);
	product ? res.json(product) : res.status(404).json({ message: 'Product not found.' });
});

app.get('/api/categories', async (_, res) => res.json(await Product.distinct('category')));
app.get('/api/cart', auth, async (req, res) => {
	const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
	res.json(cart || { items: [] });
});

app.put('/api/cart', auth, async (req, res) => {
	const { productId, quantity } = req.body;
	let cart = await Cart.findOne({ user: req.user._id });
	if (!cart) cart = new Cart({ user: req.user._id, items: [] });
	const item = cart.items.find(i => i.product.toString() === productId);
	if (quantity <= 0) cart.items = cart.items.filter(i => i.product.toString() !== productId);
	else if (item) item.quantity = quantity;
	else cart.items.push({ product: productId, quantity });
	await cart.save();
	res.json(await cart.populate('items.product'));
});

app.delete('/api/cart', auth, async (req, res) => {
	await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] }, { upsert: true });
	res.json({ items: [] });
});

app.post('/api/orders', auth, async (req, res) => {
	if (req.body.paymentMethod !== 'demo') {
		return res.status(400).json({ message: 'Choose the simulated demo payment method to place this order.' });
	}
	const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
	if (!cart?.items.length) return res.status(400).json({ message: 'Your cart is empty.' });
	const items = cart.items.map(i => ({
		product: i.product._id,
		name: i.product.name,
		image: i.product.image,
		price: i.product.price,
		quantity: i.quantity
	}));
	const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
	const order = await Order.create({
		user: req.user._id,
		items,
		total,
		shipping: req.body.shipping,
		paymentMethod: 'Demo payment',
		paymentStatus: 'Simulated'
	});
	await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
	res.status(201).json(order);
});

app.get('/api/orders', auth, async (req, res) => res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 })));
app.get('/api/admin/orders', auth, admin, async (_, res) => res.json(await Order.find().populate('user', 'name email').sort({ createdAt: -1 })));
app.put('/api/admin/orders/:id', auth, admin, async (req, res) => res.json(await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })));
app.get('/api/admin/users', auth, admin, async (_, res) => res.json(await User.find().select('-password').sort({ createdAt: -1 })));
app.post('/api/admin/products', auth, admin, async (req, res) => res.status(201).json(await Product.create({ ...req.body, slug: `${req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}` })));
app.put('/api/admin/products/:id', auth, admin, async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/admin/products/:id', auth, admin, async (req, res) => {
	await Product.findByIdAndDelete(req.params.id);
	res.json({ ok: true });
});
app.use((_, res) => res.status(404).json({ message: 'Route not found.' }));

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lumina-commerce')
	.then(() => app.listen(port, () => console.log(`API running on ${port}`)))
	.catch(error => {
		console.error('MongoDB connection failed:', error.message);
		process.exit(1);
	});
