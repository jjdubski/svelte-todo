/**
 * Shared motion utilities for consistent, accessible transitions.
 */

const NEWTON_ITERATIONS = 4;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS = 10;

/**
 * @param {number} a1
 * @param {number} a2
 */
function _a(a1, a2) {
	return 1 - 3 * a2 + 3 * a1;
}

/**
 * @param {number} a1
 * @param {number} a2
 */
function _b(a1, a2) {
	return 3 * a2 - 6 * a1;
}

/**
 * @param {number} a1
 */
function _c(a1) {
	return 3 * a1;
}

/**
 * @param {number} t
 * @param {number} a1
 * @param {number} a2
 */
function _calcBezier(t, a1, a2) {
	return ((_a(a1, a2) * t + _b(a1, a2)) * t + _c(a1)) * t;
}

/**
 * @param {number} t
 * @param {number} a1
 * @param {number} a2
 */
function _getSlope(t, a1, a2) {
	return 3 * _a(a1, a2) * t * t + 2 * _b(a1, a2) * t + _c(a1);
}

/**
 * @param {number} x
 * @param {number} x1
 * @param {number} x2
 */
function _newtonRaphsonIterate(x, x1, x2) {
	let t = x;
	for (let i = 0; i < NEWTON_ITERATIONS; i++) {
		const slope = _getSlope(t, x1, x2);
		if (slope === 0) return t;
		const currentX = _calcBezier(t, x1, x2) - x;
		t -= currentX / slope;
	}
	return t;
}

/**
 * @param {number} x
 * @param {number} x1
 * @param {number} x2
 */
function _binarySubdivide(x, x1, x2) {
	let a = 0;
	let b = 1;
	let t = x;

	for (let i = 0; i < SUBDIVISION_MAX_ITERATIONS; i++) {
		const currentX = _calcBezier(t, x1, x2) - x;
		if (Math.abs(currentX) < SUBDIVISION_PRECISION) return t;
		if (currentX > 0) {
			b = t;
		} else {
			a = t;
		}
		t = (a + b) / 2;
	}

	return t;
}

/**
 * Create an easing function from cubic-bezier control points.
 *
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {(t: number) => number}
 */
export function cubicBezier(x1, y1, x2, y2) {
	if (x1 === y1 && x2 === y2) {
		return (t) => t;
	}

	return (t) => {
		if (t <= 0) return 0;
		if (t >= 1) return 1;

		const initialSlope = _getSlope(t, x1, x2);
		const solvedT =
			initialSlope >= NEWTON_MIN_SLOPE ? _newtonRaphsonIterate(t, x1, x2) : _binarySubdivide(t, x1, x2);

		return _calcBezier(solvedT, y1, y2);
	};
}

/**
 * Material-style easing used consistently across app transitions.
 */
export const materialEasing = cubicBezier(0.4, 0, 0.2, 1);
