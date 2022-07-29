/*
	iCertus Framework
	[ Common/Format ]

	Utility functions for formatting strings.
*/

import { DateTime } from 'luxon';

/**
 *	Normalizes an date string into an ISO date string.
 *  Mainly used to normalize for Brasil date format.
 */
export function NormalizeISODate(iso: string, time: 'start' | 'end') {

	// Try to match a Brasil standard formatted date (DD/MM/YYYY)
	let brdate = iso.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (brdate)
        iso = `${brdate[3]}-${("0"+brdate[2]).slice(-2)}-${("0"+brdate[1]).slice(-2)}`;

	let date = DateTime.fromISO(iso).toISODate();
	if (time === 'start') return date+'T00:00:00.000Z'
	return date+'T23:59:59.999Z'
}

/**
 * Parse a numeric value from a string.
 * This method normalizes Brasil and International numeric standard:
 * `"1,234.56" = "1.234,56" = float(1234.56)`
 */
export function ParseNumeric(value: string|number): number|undefined {
	if (typeof value === 'number') return value;

	// Extract value using ReGeX.
	// This is necessary since Brasil has an opposite numeric standard: 1.000,25
	let str = value as string;
	let match = /(\d+[,.]?)+/.exec(str);
	if (!match) return undefined;
	
	// Integer match
	if (match[0] === match[1]) return parseInt(match[0]);

	// Decimal match
	let dec = match[1];
	let int = match[0].replace(dec, '').replace(/[,.]/g,'');

	return parseInt(int) + parseInt(dec)/(10**dec.length);
}

export function byId<T extends {id: number}>(resources: T[]): Record<number,T> {
	let map:Record<number,T> = {};
	for (let i = 0; i < resources.length; i++) {
		let resource = resources[i];
		map[resource.id] = resource;
	}
	return map;
}