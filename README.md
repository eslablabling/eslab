<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logbook Inventaris</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Halaman Login -->
    <div id="loginPage" class="container-login">
        <h3>Login Inventaris</h3>
        <input type="text" id="username" placeholder="Username">
        <input type="password" id="password" placeholder="Password">
        <button onclick="handleLogin()" class="btn-primary">Masuk</button>
        <p id="loginError" class="error">Username atau Password salah!</p>
    </div>

    <!-- Halaman Utama -->
    <div id="mainPage" class="container-main" style="display: none;">
        <div class="header">
            <h2>Logbook Inventaris</h2>
            <button onclick="handleLogout()" class="btn-danger">Logout</button>
        </div>
        
        <div class="input-group">
            <input type="text" id="itemName" placeholder="Nama Barang">
            <input type="number" id="itemQty" placeholder="Jumlah">
            <button onclick="addItem()" class="btn-success">Tambah</button>
        </div>

        <input type="text" id="searchInput" onkeyup="searchTable()" placeholder="Cari barang...">

        <table id="inventoryTable">
            <thead>
                <tr>
                    <th>Nama</th>
                    <th>Jumlah</th>
                    <th>Waktu</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>

    <script src="script.js"></script>
</body>
</html>
