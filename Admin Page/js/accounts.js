import { auth, db, rtdb } from '../../firebase-config.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref as rtdbRef, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    // Support both old IDs and the new acct-* IDs so it's backwards-compatible
    const firstNameField = document.getElementById('acct-first') || document.getElementById('firstName');
    const lastNameField  = document.getElementById('acct-last')  || document.getElementById('lastName');
    const usernameField  = document.getElementById('acct-email') || document.getElementById('username');
    const passwordField  = document.getElementById('acct-password') || document.getElementById('password');
    const roleField      = document.getElementById('acct-role')   || document.getElementById('role');

    // Prefer exact button id, fall back to other selectors if needed
    const createAccountButton = document.getElementById('create-account-btn')
                                || document.querySelector('.form-section button')
                                || document.querySelector('.btn-create');

    const accountRows = document.getElementById('account-rows');
    const logoutButton = document.querySelector('.logout-btn');

    let presenceListeners = [];

    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = '../Log-Reg Page/login.html';
            }).catch((error) => {
                console.error('Logout Error:', error);
                alert('Failed to logout. Please try again.');
            });
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                loadAccounts();
            } else {
                window.location.href = '../Log-Reg Page/login.html';
            }
        } else {
            window.location.href = '../Log-Reg Page/login.html';
        }
    });

    async function loadAccounts() {
        presenceListeners.forEach(unsubscribe => unsubscribe());
        presenceListeners = [];
        if (accountRows) accountRows.innerHTML = ''; 

        const usersSnapshot = await getDocs(collection(db, 'users'));
        let id = 1;

        usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            const status = userData.status || 'active';
            const createdAt = userData.createdAt;
            let dateCreated = 'N/A';

            if (createdAt && typeof createdAt.toDate === 'function') {
                dateCreated = createdAt.toDate().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
            }

            const row = document.createElement('div');
            row.classList.add('table-row');
            
            row.innerHTML = `
                <div>${id++}</div>
                <div>${userData.firstName} ${userData.lastName}</div>
                <div>${userData.email}</div>
                <div>${dateCreated}</div>
                <div>
                    <select class="role-select">
                        <option value="user" ${userData.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${userData.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div>
                    <span class="status-${status}">${status}</span>
                </div>
                <div class="online-status" id="online-status-${userDoc.id}"><span style="color: grey;">●</span> Checking...</div>
                <div>
                    <button class="actions-btn">
                        ${status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            `;

            const roleSelect = row.querySelector('.role-select');
            roleSelect.dataset.userId = userDoc.id;
            roleSelect.addEventListener('change', handleRoleChange);

            const actionButton = row.querySelector('.actions-btn');
            actionButton.dataset.userId = userDoc.id;
            actionButton.dataset.status = status;
            actionButton.addEventListener('click', handleToggleStatusClick);

            accountRows.appendChild(row);

            const userStatusRef = rtdbRef(rtdb, '/status/' + userDoc.id);
            const unsubscribe = onValue(userStatusRef, (snapshot) => {
                const statusCell = document.getElementById(`online-status-${userDoc.id}`);
                if (statusCell) {
                    if (snapshot.exists() && snapshot.val().isOnline) {
                        statusCell.innerHTML = '<span style="color: #4CAF50;">●</span> Online';
                    } else if (snapshot.exists()) {
                        const lastSeen = new Date(snapshot.val().last_changed).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        statusCell.innerHTML = `<span style="color: grey;">●</span> ${lastSeen}`;
                    } else {
                        statusCell.innerHTML = '<span style="color: grey;">●</span> Offline';
                    }
                }
            });
            presenceListeners.push(unsubscribe);
        });
    }

    async function createAccount() {
        // Ensure fields exist
        if (!usernameField || !passwordField || !firstNameField || !lastNameField || !roleField) {
            alert('Create account fields not found on the page. Check HTML IDs.');
            return;
        }

        const email = usernameField.value.trim();
        const password = passwordField.value.trim();
        const firstName = firstNameField.value.trim();
        const lastName = lastNameField.value.trim();
        const role = roleField.value || 'user';

        if (!email || !password || !firstName || !lastName) {
            alert('Please fill out all fields.');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            // send verification email
            await sendEmailVerification(newUser);

            // save user doc
            await setDoc(doc(db, 'users', newUser.uid), {
                firstName: firstName,
                lastName: lastName,
                email: email,
                emailVerified: false,
                role: role,
                status: 'active',
                sex: "",
                createdAt: serverTimestamp(),
                address: { blkNo: "", street: "", town: "", city: "", country: "", zip: "" }
            });
            
            alert("Account created successfully. A verification email has been sent.");
            await loadAccounts(); 

            // reset fields
            firstNameField.value = '';
            lastNameField.value = '';
            usernameField.value = '';
            passwordField.value = '';
            if (roleField.tagName === 'SELECT') roleField.selectedIndex = 0;

        } catch (error) {
            console.error("Error creating new account:", error);
            alert("Could not create account: " + (error && error.message ? error.message : error));
        }
    }

    async function handleRoleChange(event) {
        const select = event.target;
        const userId = select.dataset.userId;
        const newRole = select.value;
        const userDocRef = doc(db, "users", userId);

        select.disabled = true;
        try {
            await updateDoc(userDocRef, { role: newRole });
        } catch (error) {
            console.error("Error changing role:", error);
            alert("There was an error updating the role. The page will be refreshed to ensure data consistency.");
            location.reload();
        } finally {
            select.disabled = false;
        }
    }

    async function handleToggleStatusClick(event) {
        const button = event.target;
        const userId = button.dataset.userId;
        const currentStatus = button.dataset.status;
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const userDocRef = doc(db, "users", userId);

        button.disabled = true;
        try {
            await updateDoc(userDocRef, { status: newStatus });
            
            const row = button.closest('.table-row');
            const statusSpan = row.querySelector('span[class^="status-"]');
            
            statusSpan.textContent = newStatus;
            statusSpan.className = `status-${newStatus}`;
            
            button.textContent = newStatus === 'active' ? 'Deactivate' : 'Activate';
            button.dataset.status = newStatus;

        } catch (error) {
            console.error("Error toggling status:", error);
            alert("There was an error toggling the status. The page will be refreshed to ensure data consistency.");
            location.reload();
        } finally {
            button.disabled = false;
        }
    }

    // Only attach listener if a button was found
    if (createAccountButton) {
        createAccountButton.addEventListener('click', (e) => {
            e.preventDefault();
            createAccount();
        });
    } else {
        console.warn('Create account button not found - expected #create-account-btn or .btn-create.');
    }
});
