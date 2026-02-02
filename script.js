const USER_DATA = { user: "admin", pass: "12345" };

window.onload = function() {
    if (localStorage.getItem("isLoggedIn") === "true") {
        showMainPage();
    }
};

// Data Login yang diizinkan
const VALID_USER = {
    username: "admin",
    password: "123" // Anda bisa ganti passwordnya di sini
};

// Cek status login saat halaman dimuat (Auto-login jika session masih ada)
window.onload = function() {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn === "true") {
        showMainPage();
    }
};

// Fungsi untuk menangani klik tombol Masuk
function handleLogin() {
    const userInp = document.getElementById("username").value;
    const passInp = document.getElementById("password").value;
    const errorMsg = document.getElementById("loginError");

    // Validasi apakah input sama dengan data admin
    if (userInp === VALID_USER.username && passInp === VALID_USER.password) {
        localStorage.setItem("isLoggedIn", "true"); // Simpan status login
        localStorage.setItem("currentUser", userInp); // Opsional: simpan nama user
        errorMsg.style.display = "none";
        showMainPage();
    } else {
        // Tampilkan pesan error jika salah
        errorMsg.style.display = "block";
        errorMsg.innerText = "Username atau Password Admin salah!";
    }
}

// Fungsi menampilkan halaman utama
function showMainPage() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("mainPage").style.display = "block";
    loadData(); // Memuat data inventaris dari localStorage
}

// Fungsi Logout
function handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
        localStorage.removeItem("isLoggedIn");
        location.reload(); // Refresh untuk kembali ke tampilan login
    }
}


// --- LOGIKA INVENTARIS ---
function addItem() {
    const name = document.getElementById('itemName').value;
    const qty = document.getElementById('itemQty').value;
    if (name && qty) {
        const item = { id: Date.now(), name, qty, time: new Date().toLocaleString() };
        let inventory = JSON.parse(localStorage.getItem('myInventory')) || [];
        inventory.push(item);
        localStorage.setItem('myInventory', JSON.stringify(inventory));
        renderRow(item);
        document.getElementById('itemName').value = '';
        document.getElementById('itemQty').value = '';
    }
}

function loadData() {
    document.querySelector('#inventoryTable tbody').innerHTML = '';
    let inventory = JSON.parse(localStorage.getItem('myInventory')) || [];
    inventory.forEach(item => renderRow(item));
}

function renderRow(item) {
    const tbody = document.querySelector('#inventoryTable tbody');
    const row = tbody.insertRow();
    row.setAttribute('data-id', item.id);
    row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>${item.time}</td>
        <td>
            <button onclick="editItem(${item.id})" style="background:#2196F3; color:white;">Edit</button>
            <button onclick="deleteItem(${item.id})" style="background:#f44336; color:white;">Hapus</button>
        </td>
    `;
}

function deleteItem(id) {
    let inventory = JSON.parse(localStorage.getItem('myInventory')) || [];
    inventory = inventory.filter(i => i.id !== id);
    localStorage.setItem('myInventory', JSON.stringify(inventory));
    document.querySelector(`tr[data-id="${id}"]`).remove();
}

function editItem(id) {
    let inventory = JSON.parse(localStorage.getItem('myInventory')) || [];
    const idx = inventory.findIndex(i => i.id === id);
    const newName = prompt("Nama baru:", inventory[idx].name);
    const newQty = prompt("Jumlah baru:", inventory[idx].qty);
    if (newName && newQty) {
        inventory[idx].name = newName;
        inventory[idx].qty = newQty;
        localStorage.setItem('myInventory', JSON.stringify(inventory));
        loadData();
    }
}

function searchTable() {
    let filter = document.getElementById("searchInput").value.toUpperCase();
    let rows = document.querySelector("#inventoryTable tbody").rows;
    for (let row of rows) {
        let name = row.cells[0].textContent.toUpperCase();
        row.style.display = name.includes(filter) ? "" : "none";
    }
}
