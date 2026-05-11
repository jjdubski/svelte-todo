import mongoose from 'mongoose';
import { env } from '$env/dynamic/private';

/** @type {{ conn: typeof mongoose | null, promise: Promise<typeof mongoose> | null }} */
let cached = global._mongooseConnection;

if (!cached) {
	cached = global._mongooseConnection = { conn: null, promise: null };
}

/** Connection options tuned for serverless environments (Vercel). */
const CONNECTION_OPTIONS = {
	// Fail fast if MongoDB is unreachable (e.g. IP not whitelisted).
	serverSelectionTimeoutMS: 5000,
	// Close idle connections quickly in serverless.
	socketTimeoutMS: 45000,
	// Let each invocation use its own connection in serverless.
	maxPoolSize: 1,
	minPoolSize: 0,
	// Wait up to 2s for a connection from the pool.
	waitQueueTimeoutMS: 2000,
	// Retry writes once if a transient error occurs.
	retryWrites: true,
	// Use the 'majority' write concern for data safety.
	w: 'majority'
};

/**
 * Translate a Mongoose connection error into a human-readable message.
 * @param {Error} err
 * @returns {string}
 */
function formatConnectionError(err) {
	const msg = /** @type {string} */ (err.message || '');
	if (msg.includes('Could not connect to any servers')) {
		return (
			'MongoDB Atlas connection refused — your Vercel deployment IP is likely not whitelisted. ' +
			'Go to https://cloud.mongodb.com → Network Access → Add IP Address and add ' +
			"0.0.0.0/0 (or Vercel's IP range for production). " +
			'See: https://www.mongodb.com/docs/atlas/security-whitelist/'
		);
	}
	if (msg.includes('Authentication failed')) {
		return (
			'MongoDB authentication failed. Check that your STORAGE_MONGODB_URI contains the correct ' +
			'username, password, and database name. If your password contains special characters, ' +
			'they must be URL-encoded.'
		);
	}
	if (msg.includes('ENOTFOUND')) {
		return 'MongoDB hostname could not be resolved. Check that your STORAGE_MONGODB_URI cluster name is correct.';
	}
	return msg;
}

/**
 * Connect to MongoDB and return the mongoose instance.
 * Uses a cached connection pattern to avoid multiple connections in serverless.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
	if (cached.conn) return cached.conn;

	if (!cached.promise) {
		const uri = env.STORAGE_MONGODB_URI;
		if (!uri) {
			console.error('[db] STORAGE_MONGODB_URI environment variable is not set');
			throw new Error('STORAGE_MONGODB_URI is not configured');
		}

		cached.promise = mongoose.connect(uri, CONNECTION_OPTIONS).then((m) => {
			console.log('[db] Connected to MongoDB');
			return m;
		});
	}

	try {
		cached.conn = await cached.promise;
	} catch (err) {
		cached.promise = null;
		const friendly = formatConnectionError(/** @type {Error} */ (err));
		console.error('[db] MongoDB connection error:', friendly);
		// Also log the raw error for debugging
		console.error('[db] Raw error:', err);
		throw new Error(friendly);
	}

	return cached.conn;
}
