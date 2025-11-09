// This is a ONE-TIME setup script (setup-admin.js)

const fs = require('fs');
const bcrypt = require('bcrypt');

// --- Define your first admin account here ---
const adminUsername = "superadmin";
const adminPassword = "adminpass123"; // You can change this
const recoveryEmail = "superadmin@vnit.ac.in";
// ------------------------------------------

const saltRounds = 10;

console.log(`Hashing password for ${adminUsername}...`);

bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
    if (err) {
        console.error("Error hashing password:", err);
        return;
    }

    const adminData = [{
        username: adminUsername,
        passwordHash: hash, // We store the HASH, not the password
        recoveryEmail: recoveryEmail,
        isSuperAdmin: true // This admin will be able to add other admins later
    }];

    // Create a new admins.json file
    fs.writeFile("admins.json", JSON.stringify(adminData, null, 2), (err) => {
        if (err) {
            console.error("Error writing admins.json:", err);
        } else {
            console.log(`\n✅ admins.json created successfully with ${adminUsername}!`);
            console.log("You can now delete this setup-admin.js file and restart your server.");
        }
    });
});