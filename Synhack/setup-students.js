// This is a ONE-TIME setup script (setup-students.js)

const fs = require('fs');
const bcrypt = require('bcrypt');

// The student data you provided
const students = [
    { username: "33704", password: "bt25eee002" },
    { username: "34185", password: "bt25eee058" },
    { username: "34567", password: "bt25cse098" },
    { username: "34007", password: "bt25eee034" },
    { username: "23456", password: "bt25ece110" }
];

const saltRounds = 10;
const hashedStudents = [];
let processedCount = 0;

console.log(`Starting to hash ${students.length} student passwords...`);

students.forEach(student => {
    bcrypt.hash(student.password, saltRounds, (err, hash) => {
        if (err) {
            console.error(`Error hashing password for ${student.username}`, err);
            return;
        }
        
        hashedStudents.push({
            username: student.username,
            passwordHash: hash
        });

        processedCount++;
        console.log(`Hashed password for ${student.username} (${processedCount}/${students.length})`);

        // When all passwords are hashed, save the file
        if (processedCount === students.length) {
            fs.writeFile("students.json", JSON.stringify(hashedStudents, null, 2), (err) => {
                if (err) {
                    console.error("Error writing students.json:", err);
                } else {
                    console.log("\n✅ students.json created successfully with all 5 students!");
                    console.log("You can now delete this setup-students.js file and restart your server.");
                }
            });
        }
    });
});