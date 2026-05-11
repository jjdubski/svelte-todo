import mongoose from 'mongoose';
import { MONGODB_URI } from '$env/static/private';

/** @type {{ conn: typeof mongoose | null, promise: Promise<typeof mongoose> | null }} */
let cached = global._mongooseConnection;

if (!cached) {
	cached = global._mongooseConnection = { conn: null, promise: null };
}

/**
 * Connect to MongoDB and return the mongoose instance.
 * Uses a cached connection pattern to avoid multiple connections in serverless.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
	if (cached.conn) return cached.conn;

	if (!cached.promise) {
		const uri = MONGODB_URI;
		if (!uri) {
			console.error('[db] MONGODB_URI environment variable is not set');
			throw new Error('MONGODB_URI is not configured');
		}

		cached.promise = mongoose.connect(uri).then((m) => {
			console.log('[db] Connected to MongoDB');
			return m;
		});
	}

	try {
		cached.conn = await cached.promise;
	} catch (err) {
		cached.promise = null;
		console.error('[db] MongoDB connection error:', err);
		throw err;
	}

	return cached.conn;
}
