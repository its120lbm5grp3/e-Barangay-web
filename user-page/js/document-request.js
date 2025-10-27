import {
	auth, db
}
from '../../firebase-config.js';
import {
	doc, getDoc, addDoc, collection, serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
	onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
document.addEventListener('DOMContentLoaded', () => {
	const form = document.querySelector('.form');
	const firstNameField = document.getElementById('first_name');
	const lastNameField = document.getElementById('last_name');
	const addressField = document.getElementById('address');
	// ensure toast container exists
	let toastContainer = document.getElementById('eb-toast-container');
	if(!toastContainer) {
		toastContainer = document.createElement('div');
		toastContainer.id = 'eb-toast-container';
		toastContainer.setAttribute('aria-live', 'polite');
		toastContainer.setAttribute('aria-atomic', 'true');
		document.body.appendChild(toastContainer);
	}

	function escapeHtml(str) {
		if(str === null || str === undefined) return '';
		return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
	}
	// showToast(type, title, message, timeoutMs)
	function showToast(type = 'info', title = '', message = '', timeoutMs = 4500) {
		const container = document.getElementById('eb-toast-container');
		if(!container) return;
		const item = document.createElement('div');
		item.className = `eb-toast ${type}`;
		item.innerHTML = `
      <div class="eb-body">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(message)}</p>
      </div>
      <button type="button" class="eb-close" aria-label="Close toast">×</button>
    `;
		// append and animate
		container.appendChild(item);
		// attach close
		const closeBtn = item.querySelector('.eb-close');
		closeBtn.addEventListener('click', () => remove(item));
		// force repaint then show
		requestAnimationFrame(() => item.classList.add('eb-show'));
		// auto remove
		const timer = setTimeout(() => remove(item), timeoutMs);

		function remove(el) {
			clearTimeout(timer);
			el.classList.remove('eb-show');
			// remove after animation
			setTimeout(() => {
				if(el.parentNode) el.parentNode.removeChild(el);
			}, 380);
		}
	}
	// modal helpers (unchanged)
	const modal = document.getElementById('modal');
	const modalMessage = document.getElementById('modal-message');
	const modalOkButton = document.getElementById('modal-ok');
	const termsModal = document.getElementById('termsModal');
	const termsOkButton = document.getElementById('terms-ok');
	const showModal = (message, isTerms = false) => {
		if(isTerms) {
			document.getElementById('terms-message').textContent = message;
			termsModal.style.display = 'block';
		} else {
			modalMessage.textContent = message;
			modal.style.display = 'block';
		}
	};
	const hideModal = (isTerms = false) => {
		if(isTerms) termsModal.style.display = 'none';
		else modal.style.display = 'none';
	};
	if(modalOkButton) modalOkButton.addEventListener('click', () => hideModal());
	if(termsOkButton) termsOkButton.addEventListener('click', () => hideModal(true));
	// populate user fields
	onAuthStateChanged(auth, async(user) => {
		if(user) {
			try {
				const userDocRef = doc(db, 'users', user.uid);
				const userDocSnap = await getDoc(userDocRef);
				if(userDocSnap.exists()) {
					const userData = userDocSnap.data();
					firstNameField.value = userData.firstName || '';
					lastNameField.value = userData.lastName || '';
					if(userData.address) {
						addressField.value = `${userData.address.blkNo || ''} ${userData.address.street || ''}, ${userData.address.town || ''}, ${userData.address.city || ''}, ${userData.address.zip || ''}`.trim();
					}
				} else {
					window.location.href = '../Log-Reg Page/login.html';
				}
			} catch(err) {
				console.error('Error loading user:', err);
			}
		}
	});
	// submit handler
	form.addEventListener('submit', async(e) => {
		e.preventDefault();
		const user = auth.currentUser;
		if(!user) {
			showToast('error', 'Login required', 'You must be logged in to submit a request.');
			return;
		}
		const documentTypeEl = document.getElementById('document_type');
		const documentType = documentTypeEl ? documentTypeEl.value : '';
		const reason = document.getElementById('reason') ? document.getElementById('reason').value : '';
		if(!documentType) {
			showToast('error', 'Missing field', 'Please select a document type.');
			return;
		}
		try {
			await addDoc(collection(db, 'REQUESTS'), {
				userId: user.uid,
				name: `${firstNameField.value} ${lastNameField.value}`.trim(),
				documentType,
				address: addressField.value,
				reason,
				status: 'pending',
				createdAt: serverTimestamp()
			});
			showToast('success', 'Request submitted', 'Your document request has been submitted.');
			form.reset();
		} catch(err) {
			console.error('Submit error', err);
			showToast('error', 'Submission failed', 'An error occurred. Please try again.');
		}
	});
});