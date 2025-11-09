// ===== VNIT Hostel Grievance Management System (v2.0) =====

const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt'); // <-- ADD THIS
const session = require('express-session'); // <-- ADD THIS
const multer = require('multer');

const app = express();
app.use(express.urlencoded({ extended: true }));
// NEW: We also need to tell Express to understand JSON for our update requests
app.use(express.json());
// ===== ADD THIS SESSION MIDDLEWARE =====
app.use(session({
    secret: 'a-very-strong-hackathon-secret-key', // Change this to any random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // In a real app, this would be true for HTTPS
}));
// ===== END OF SESSION MIDDLEWARE =====


// ===== REPLACE YOUR OLD MULTER CONFIG WITH THIS =====

// 1. Define the absolute path to your 'uploads' folder
const uploadDir = path.join(__dirname, 'uploads');

// 2. Create the folder if it doesn't exist
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// 3. Set up storage engine (simpler version)
const storage = multer.diskStorage({
    // Use the absolute path variable we just defined
    destination: uploadDir, 

    filename: function (req, file, cb) {
        // Name the file: [timestamp]-[original_filename]
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });
// ==================================
// ==================================

const complaintsFilePath = path.join(__dirname, "complaints.json");
const studentFilePath = path.join(__dirname, "students.json"); // <-- ADD THIS
// ===== ADD THIS LINE =====
const adminFilePath = path.join(__dirname, "admins.json");
// ===== END OF LINE =====

// 🏠 Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

// This line serves static files like style.css, vnitpic.jpg
app.use(express.static(__dirname));
// This makes the /uploads folder public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
//


// 🎓 Student Portal (NOW PROTECTED)
app.get("/student", (req, res) => {
  // Check if the student's username is in their session
  if (req.session.studentUsername) {
    // If they are logged in, show them the complaint form
    res.sendFile(path.join(__dirname, "index.html"));
  } else {
    // If not, redirect them to the student login page
    res.redirect("/student-login");
  }
});

// 👩‍💼 Admin Login
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});


// ===== ADD ALL THESE NEW STUDENT LOGIN ROUTES =====

// 1. This route serves the student-login.html page
app.get("/student-login", (req, res) => {
  res.sendFile(path.join(__dirname, "student-login.html"));
});

// 2. This route handles the form submission
app.post("/student-login", (req, res) => {
  const { username, password } = req.body;

  // Read the students.json file
  fs.readFile(studentFilePath, "utf8", (err, data) => {
    if (err || !data) {
      return res.send("<h3>Server error. Unable to read student data.</h3><a href='/student-login'>Try again</a>");
    }

    const students = JSON.parse(data);
    
    // Find the student by username
    const student = students.find(s => s.username === username);
    if (!student) {
      return res.send("<h3>Invalid Student ID or Password.</h3><a href='/student-login'>Try again</a>");
    }

    // Compare the typed password with the hashed password
    bcrypt.compare(password, student.passwordHash, (err, isMatch) => {
      if (err) {
        return res.send("<h3>Server error during authentication.</h3><a href='/student-login'>Try again</a>");
      }

      if (isMatch) {
        // ✅ Password is correct! Save user in session
        req.session.studentUsername = student.username;
        // Redirect them to the main complaint form
        res.redirect("/student"); 
      } else {
        // ❌ Password is incorrect
        res.send("<h3>Invalid Student ID or Password.</h3><a href='/student-login'>Try again</a>");
      }
    });
  });
});

// 3. This route handles logging out
app.get("/student-logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error logging out");
        }
        res.redirect("/"); // Redirect to the home page
    });
});

// ===== END OF NEW ROUTES =====



// 📝 Submit Complaint (from student form)
app.post("/submit", upload.single('complaintImage'), (req, res) => {
  const { name, id, hostel, room, category, complaint, timeslot } = req.body;
  
  // ===== ADD THIS LINE =====
  // A checked box will send "on", an unchecked box sends "undefined"
  const isEmergency = req.body.emergency === 'on'; 
  // ===== END OF LINE =====

 
  if (!name || !id || !hostel || !room || !category || !complaint || !timeslot) {
    return res.send(`<h2>Please fill all fields properly!</h2><a href="/student">Go Back</a>`);
  }

  // NEW: Read the JSON file, parse it, add the new complaint, and write it back
  fs.readFile(complaintsFilePath, "utf8", (err, data) => {
    const complaints = data ? JSON.parse(data) : [];

    // NEW: Create a new complaint object with all the tracking fields
    const newComplaint = {
      complaintId: Date.now().toString(), // A simple unique ID
      isEmergency: isEmergency, // ===== ADD THIS LINE =====
      name,
      id,
      hostel,
      room,
      category,
      complaint,
      timeslot,
      submitted: new Date().toLocaleString(),
      status: "Pending", // Default status
      technician: "Not Assigned",
      techContact: "",
      feedback: "",
      imageFile: req.file ? req.file.filename : null
    };

    complaints.push(newComplaint);

    fs.writeFile(complaintsFilePath, JSON.stringify(complaints, null, 2), (err) => {
      if (err) return res.send("<h3>Error saving complaint!</h3>");

      // NEW: We MUST give the student their Complaint ID
      res.send(`
        <html>
          <head>
            <title>Complaint Submitted</title>
            <style>
              body {
                background: url('vnitpic.jpg') no-repeat center center fixed;
                background-size: cover;
                font-family: Poppins, sans-serif;
                color: white;
                text-align: center;
                margin-top: 80px;
              }
              .box {
                background: rgba(0,0,0,0.7);
                padding: 30px;
                border-radius: 12px;
                display: inline-block;
              }
              a {
                color: #fff;
                background: #004aad;
                padding: 8px 15px;
                text-decoration: none;
                border-radius: 6px;
              }
              .complaint-id {
                background: #fff;
                color: #004aad;
                font-weight: bold;
                font-size: 1.2em;
                padding: 10px;
                border-radius: 5px;
                display: inline-block;
                margin-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="box">
              <h2>✅ Complaint Submitted Successfully</h2>
              <p>Please save your Complaint ID for tracking:</p>
              <div class="complaint-id">${newComplaint.complaintId}</div>
              <br/><br/><br/>
              <a href="/">Back to Home</a>
              <a href="/track" style="margin-left: 10px;">Track Your Complaint</a>
            </div>
          </body>
        </html>
      `);
    });
  });
});


// 👩‍💼 Admin Login Validation (CORRECTED VERSION)
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  // 1. Read the admins.json file
  fs.readFile(adminFilePath, "utf8", (err, data) => {
    if (err || !data) {
      return res.send("<h3>❌ Server error. Please contact admin.</h3><a href='/admin'>Try again</a>");
    }

    const admins = JSON.parse(data);

    // 2. Find the admin by username
    const admin = admins.find(a => a.username === username);
    if (!admin) {
      return res.send("<h3>❌ Invalid credentials!</h3><a href='/admin'>Try again</a>");
    }

    // 3. Compare the typed password with the stored hash
    //    The "if (isMatch)" block MUST be INSIDE this function
    bcrypt.compare(password, admin.passwordHash, (err, isMatch) => {
      if (err) {
        return res.send("<h3>❌ Server error.</h3><a href='/admin'>Try again</a>");
      }

      // This is the block that was causing the error
      // It is now correctly INSIDE the bcrypt.compare callback
      if (isMatch) {
        // ✅ Password is correct! Save admin in session
        req.session.adminUsername = admin.username;
        req.session.isSuperAdmin = admin.isSuperAdmin; // Save if they are superadmin
        res.redirect("/dashboard");
      } else {
        // ❌ Password is incorrect
        return res.send("<h3>❌ Invalid credentials!</h3><a href='/admin'>Try again</a>");
      }
    }); // <-- The bcrypt.compare function ends here

  }); // <-- The fs.readFile function ends here

}); // <-- The app.post route ends here



// ===== ADD THIS NEW ROUTE TO CREATE ADMINS =====
app.post("/add-admin", (req, res) => {
  // 1. Check if the user is logged in as an admin
  if (!req.session.adminUsername) {
    return res.status(403).send("<h3>Access Denied. You are not logged in.</h3>");
  }
  
  // OPTIONAL: You could add a check here to only allow a "superadmin"
  // if (!req.session.isSuperAdmin) {
  //   return res.send("<h3>Access Denied. Only a Super Admin can add new admins.</h3>");
  // }

  const { username, password, email } = req.body;

  // 2. Read the admins.json file
  fs.readFile(adminFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.send("<h3>Server error. Please try again later.</h3>");
    }
    
    const admins = JSON.parse(data || '[]');

    // 3. Check if username already exists
    const existingAdmin = admins.find(a => a.username === username);
    if (existingAdmin) {
      return res.send("<h3>Admin username already exists.</h3><a href='/dashboard'>Go Back</a>");
    }

    // 4. Hash the new password and add the admin
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        return res.send("<h3>Server error. Could not create account.</h3>");
      }
      
      const newAdmin = {
        username: username,
        passwordHash: hash,
        recoveryEmail: email,
        isSuperAdmin: false // New admins are FALSE by default
      };
      
      admins.push(newAdmin);

      // 5. Save the updated admin list back to the file
      fs.writeFile(adminFilePath, JSON.stringify(admins, null, 2), (err) => {
        if (err) {
          return res.send("<h3>Server error. Could not save account.</h3>");
        }
        
        // Success! Redirect back to the dashboard
        console.log(`New admin ${username} was created by ${req.session.adminUsername}`);
        res.redirect("/dashboard");
      });
    });
  });
});
// ===========================================

// 📊 Admin Dashboard Page (NOW PROTECTED)
app.get("/dashboard", (req, res) => {
  if (req.session.adminUsername) {
    // If admin is logged in, show the dashboard
    res.sendFile(path.join(__dirname, "admin_dashboard.html"));
  } else {
    // If not, redirect to the admin login page
    res.redirect("/admin");
  }
});

// 📂 Serve complaints as JSON (This now just reads the JSON file)
app.get("/get-complaints", (req, res) => {
  fs.readFile(complaintsFilePath, "utf8", (err, data) => {
    if (err || !data) {
      return res.json([]);
    }
    res.json(JSON.parse(data));
  });
});

// NEW: This is the route that will handle updates from the admin
app.post("/update-complaint", (req, res) => {
  const { complaintId, status, technician, techContact } = req.body;

  fs.readFile(complaintsFilePath, "utf8", (err, data) => {
    if (err) return res.json({ success: false, message: "Error reading file" });

    let complaints = JSON.parse(data);
    
    // Find the complaint by its ID
    const index = complaints.findIndex(c => c.complaintId === complaintId);
    
    if (index === -1) {
      return res.json({ success: false, message: "Complaint not found" });
    }

    // Update the complaint details
    complaints[index].status = status;
    complaints[index].technician = technician;
    complaints[index].techContact = techContact;

    // Save the updated list back to the file
    fs.writeFile(complaintsFilePath, JSON.stringify(complaints, null, 2), (err) => {
      if (err) return res.json({ success: false, message: "Error saving file" });
      res.json({ success: true });
    });
  });
});

// NEW: We need a route to serve the new tracking page
app.get("/track", (req, res) => {
  res.sendFile(path.join(__dirname, "track.html"));
});

// NEW: This route finds and returns a single complaint for the student
app.get("/track-complaint", (req, res) => {
  const { complaintId } = req.query; // e.g., /track-complaint?complaintId=12345
  
  fs.readFile(complaintsFilePath, "utf8", (err, data) => {
    if (err || !data) return res.json({ success: false });

    const complaints = JSON.parse(data);
    const complaint = complaints.find(c => c.complaintId === complaintId);

    if (complaint) {
      res.json({ success: true, data: complaint });
    } else {
      res.json({ success: false });
    }
  });
});

// NEW: This route handles the feedback submission from the student
app.post("/submit-feedback", (req, res) => {
    const { complaintId, feedback } = req.body;

    fs.readFile(complaintsFilePath, "utf8", (err, data) => {
        if (err) return res.json({ success: false, message: "Error reading file" });
        
        let complaints = JSON.parse(data);
        const index = complaints.findIndex(c => c.complaintId === complaintId);

        if (index === -1) {
            return res.json({ success: false, message: "Complaint not found" });
        }

        complaints[index].feedback = feedback;

        fs.writeFile(complaintsFilePath, JSON.stringify(complaints, null, 2), (err) => {
            if (err) return res.json({ success: false, message: "Error saving file" });
            res.json({ success: true, message: "Feedback submitted!" });
        });
    });
});
// ===== ADD THIS NEW ROUTE FOR EDITING A COMPLAINT =====
app.post("/edit-complaint", (req, res) => {
    const { complaintId, newText } = req.body;

    // 1. Read the complaints file
    fs.readFile(complaintsFilePath, "utf8", (err, data) => {
        if (err) return res.json({ success: false, message: "Error reading file" });
        
        let complaints = JSON.parse(data);
        const index = complaints.findIndex(c => c.complaintId === complaintId);

        // 2. Check if complaint exists
        if (index === -1) {
            return res.json({ success: false, message: "Complaint not found" });
        }

        // 3. IMPORTANT: Only allow edits if status is "Pending"
        if (complaints[index].status !== 'Pending') {
            return res.json({ success: false, message: "Cannot edit a complaint that is already In Progress or Completed." });
        }

        // 4. Update the complaint text
        complaints[index].complaint = newText;

        // 5. Save the file back
        fs.writeFile(complaintsFilePath, JSON.stringify(complaints, null, 2), (err) => {
            if (err) return res.json({ success: false, message: "Error saving file" });
            res.json({ success: true, message: "Complaint updated!" });
        });
    });
});
// =======================================================


// ✅ Start Server
app.listen(3000, () => console.log("🚀 Server running at http://localhost:3000"));
// ===== ADD THIS NEW ADMIN LOGOUT ROUTE =====
app.get("/admin-logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error logging out");
        }
        res.redirect("/"); // Redirect to the home page
    });
});
// ==========================================


// ✅ Start Server
app.listen(3000, () => console.log("🚀 Server running at http://localhost:3000"));