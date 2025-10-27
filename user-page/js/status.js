// status-simple.js (updated - uses full snapshot to ensure ETA updates in real time)
// Minimal table showing only the signed-in user's REQUESTS + ENLISTMENTS.
// Includes ETA column for document requests and fixes realtime ETA updates.
import {
	auth, db
}
from '../../firebase-config.js';
import {
	onAuthStateChanged
}
from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
	collection,
	query,
	where,
	onSnapshot
}
from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
const tbody = document.getElementById('statusTbody');
const emptyEl = document.getElementById('statusEmpty');
const errorEl = document.getElementById('statusError');
let unsubList = [];
let items = []; // merged items
let currentUser = null; // stores signed-in user (uid, email)
// Helpers --------------------------------------------------------------------
function clearTable() {
	if(tbody) tbody.innerHTML = '';
}

function showEmpty(show, msg = 'No requests or enlistments found.') {
	if(!emptyEl) return;
	emptyEl.style.display = show ? 'block' : 'none';
	emptyEl.innerText = msg;
}

function showError(msg) {
	if(!errorEl) return;
	errorEl.innerText = msg || '';
	errorEl.style.display = msg ? 'block' : 'none';
}

function tsToMillis(ts) {
	try {
		if(!ts) return 0;
		return(typeof ts.toDate === 'function') ? ts.toDate().getTime() : new Date(ts).getTime();
	} catch {
		return 0;
	}
}

function formatDate(ts) {
	try {
		if(!ts) return '—';
		const d = (typeof ts.toDate === 'function') ? ts.toDate() : new Date(ts);
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	} catch {
		return String(ts);
	}
}

function escapeHtml(str) {
	return String(str ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
// Filtering guard: returns true only if doc belongs to current user
function docBelongsToCurrentUser(docData) {
	if(!currentUser) return false;
	if(docData.userId && currentUser.uid && docData.userId === currentUser.uid) return true;
	if(!docData.userId && docData.email && currentUser.email && docData.email === currentUser.email) return true;
	return false;
}
// Upsert from full snapshot -------------------------------------------------
function upsertFromSnapshot(snapshot, collectionName) {
	// Keep a map of existing items so we don't drop entries from the other collection
	const map = new Map(items.map(i => [`${i.col}:${i.id}`, i]));
	const seenKeys = new Set();
	// Iterate all docs in the snapshot and update the map for this collection
	snapshot.docs.forEach(docSnap => {
		const id = docSnap.id;
		const key = `${collectionName}:${id}`;
		const data = docSnap.data();
		// Only keep documents that belong to the signed-in user
		if(!docBelongsToCurrentUser(data)) {
			map.delete(key);
			return;
		}
		map.set(key, {
			id, col: collectionName, data
		});
		seenKeys.add(key);
	});
	// Remove any existing items from this collection that were NOT present in the snapshot
	// (this handles deletes server-side)
	for(const k of Array.from(map.keys())) {
		if(k.startsWith(`${collectionName}:`) && !seenKeys.has(k)) {
			map.delete(k);
		}
	}
	// Convert back to array and sort by createdAt (newest first)
	items = Array.from(map.values()).sort((a, b) => (tsToMillis(b.data.createdAt) || 0) - (tsToMillis(a.data.createdAt) || 0));
	renderTable();
}

function renderTable() {
	if(!tbody) return;
	clearTable();
	showError('');
	if(!items || items.length === 0) {
		showEmpty(true);
		return;
	}
	showEmpty(false);
	let idx = 1;
	for(const item of items) {
		const d = item.data || {};
		const tr = document.createElement('tr');
		const submitted = formatDate(d.createdAt || d.date);
		const status = (d.status || 'pending').toLowerCase();
		const badgeClass = status === 'approved' ? 'badge-approved' : status === 'denied' ? 'badge-denied' : 'badge-pending';
		// New ETA field (for REQUESTS only). Treat null/undefined/empty-string as '—'
		let etaRaw = null;
		if(item.col === 'REQUESTS') {
			// normalize
			if(d.eta === undefined || d.eta === null) etaRaw = null;
			else etaRaw = String(d.eta).trim() === '' ? null : String(d.eta);
		}
		const etaDisplay = etaRaw ? escapeHtml(etaRaw) : '—';
		tr.innerHTML = `
      <td>${idx++}</td>
      <td style="font-weight:700">${escapeHtml(d.name ?? '—')}</td>
      <td>${escapeHtml(
        item.col === 'REQUESTS'
          ? (d.documentType ?? 'Document')
          : (d.purposeOfRegistration ?? 'Enlistment')
      )}</td>
      <td>${escapeHtml(submitted)}</td>
      <td>${escapeHtml(etaDisplay)}</td>
      <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
    `;
		tbody.appendChild(tr);
	}
}
// Error handler for snapshots
function handleSnapshotError(err, collectionName) {
	console.error(`${collectionName} listener error`, err);
	if(err && err.code === 'permission-denied') {
		showError('Permission denied: verify your email or contact the administrator.');
	} else if(err && err.code === 'failed-precondition') {
		showError('Index required for this query. Admin must create the index.');
	} else {
		showError('Failed to load your requests. Try again later.');
	}
}
// Listener management -------------------------------------------------------
function cleanupListeners() {
	unsubList.forEach(u => {
		try {
			u();
		} catch(e) {}
	});
	unsubList = [];
	items = [];
	clearTable();
}

function startListenersForUser(uid) {
	cleanupListeners();
	try {
		const reqQ = query(collection(db, 'REQUESTS'), where('userId', '==', uid));
		const unReq = onSnapshot(reqQ, (snap) => upsertFromSnapshot(snap, 'REQUESTS'), (err) => handleSnapshotError(err, 'REQUESTS'));
		unsubList.push(unReq);
	} catch(err) {
		console.error('Failed to attach REQUESTS listener', err);
		handleSnapshotError(err, 'REQUESTS');
	}
	try {
		const enQ = query(collection(db, 'ENLISTMENTS'), where('userId', '==', uid));
		const unEn = onSnapshot(enQ, (snap) => upsertFromSnapshot(snap, 'ENLISTMENTS'), (err) => handleSnapshotError(err, 'ENLISTMENTS'));
		unsubList.push(unEn);
	} catch(err) {
		console.error('Failed to attach ENLISTMENTS listener', err);
		handleSnapshotError(err, 'ENLISTMENTS');
	}
}
// Auth watcher --------------------------------------------------------------
onAuthStateChanged(auth, (user) => {
	if(!user) {
		window.location.href = '../Log-Reg Page/login.html';
		return;
	}
	currentUser = user;
	console.debug('Signed in as', user.uid, user.email);
	startListenersForUser(user.uid);
});