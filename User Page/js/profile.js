import {
	auth, db
}
from '../../firebase-config.js';
import {
	onAuthStateChanged, signOut
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
	doc, getDoc, updateDoc
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// Form and input elements
const profileForm = document.querySelector('#profileForm');
const firstNameInput = document.querySelector('#firstName');
const lastNameInput = document.querySelector('#lastName');
const emailInput = document.querySelector('#email');
const blkNoInput = document.querySelector('#blkNo');
const streetInput = document.querySelector('#street');
const townInput = document.querySelector('#town');
const cityInput = document.querySelector('#city');
const zipInput = document.querySelector('#zip');
const countryInput = document.querySelector('#country');
const signOutBtn = document.querySelector('#signOutBtn');
onAuthStateChanged(auth, async(user) => {
	if(user) {
		const userDocRef = doc(db, "users", user.uid);
		const userDocSnap = await getDoc(userDocRef);
		if(userDocSnap.exists()) {
			const userData = userDocSnap.data();
			firstNameInput.value = userData.firstName || '';
			lastNameInput.value = userData.lastName || '';
			emailInput.value = userData.email || '';
			emailInput.disabled = true;
			if(userData.sex) {
				const sexRadio = document.querySelector(`input[name="sex"][value="${userData.sex}"]`);
				if(sexRadio) {
					sexRadio.checked = true;
				}
			}
			if(userData.address) {
				blkNoInput.value = userData.address.blkNo || '';
				streetInput.value = userData.address.street || '';
				townInput.value = userData.address.town || '';
				cityInput.value = userData.address.city || '';
				zipInput.value = userData.address.zip || '';
				countryInput.value = userData.address.country || '';
			}
		} else {
			console.error("User data not found in Firestore!");
			alert("Could not find your user data.");
		}
		profileForm.addEventListener('submit', async(e) => {
			e.preventDefault();
			const selectedSex = document.querySelector('input[name="sex"]:checked');
			try {
				await updateDoc(userDocRef, {
					firstName: firstNameInput.value,
					lastName: lastNameInput.value,
					sex: selectedSex ? selectedSex.value : "",
					address: {
						blkNo: blkNoInput.value,
						street: streetInput.value,
						town: townInput.value,
						city: cityInput.value,
						zip: zipInput.value,
						country: countryInput.value
					}
				});
				alert("Profile updated successfully!");
			} catch(error) {
				console.error("Error updating profile: ", error);
				alert(`Failed to update profile: ${error.message}`);
			}
		});
		signOutBtn.addEventListener('click', async() => {
			try {
				await signOut(auth);
				window.location.href = "../Log-Reg Page/login.html";
			} catch(error) {
				console.error('Error signing out:', error);
				alert('Failed to sign out. Please try again.');
			}
		});
	} else {
		console.log("No user is signed in. Redirecting to login.");
		window.location.href = "../Log-Reg Page/login.html";
	}
});