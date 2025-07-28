const express = require("express");
const router = express.Router();
const pool = require("../database");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const multer = require("multer");
const crypto = require("crypto");
const { initializeApp } = require("firebase/app");
const {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
} = require("firebase/storage");
const config = require("../config/firebase.config");

const validRoles = [
  "Employee",
  "Team Leader",
  "HR",
  "Mid Lvl Manager",
  "Top Lvl Manager",
  "Ceo",
];

//send emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Create login credentials
router.post("/loginCredentials", async (req, res) => {
  const { empId, email, password, role } = req.body;

  // Validate the role
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Log the hashed password for debugging

    const newEmployeeLogin = { empId, email, password: hashedPassword, role };

    const [results] = await pool.query(
      "INSERT INTO logindetails (empId, email, password, role) VALUES (?, ?, ?, ?)",
      [
        newEmployeeLogin.empId,
        newEmployeeLogin.email,
        newEmployeeLogin.password,
        newEmployeeLogin.role, // Include the role in the insert
      ]
    );

    // Get the newly created employee ID
    const employeeId = results.insertId; // Use results.insertId to get the new employee's ID

    // Send success response with employee ID
    res
      .status(201)
      .json({ message: "Employee Login Created successfully", employeeId });
  } catch (error) {
    console.error("Error saving employee login data:", error);
    res.status(500).json({ error: "Error saving employee login data" });
  }
});

// Use the secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

//employee login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Retrieve employee by email
    const [rows] = await pool.query(
      "SELECT * FROM logindetails WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const employee = rows[0];

    // Compare password with hashed password
    const match = await bcrypt.compare(password, employee.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Successful login: create a token
    const token = jwt.sign({ empId: employee.empId }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      employeeId: employee.empId,
      role: employee.role,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Error during login" });
  }
});

// Get employee by id
router.get("/getEmployee/:empId", async (req, res) => {
  const employeeId = req.params.empId;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM logindetails WHERE empId = ?",
      [employeeId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ message: "Employee not found" });
    }
  } catch (error) {
    console.error("Error fetching employee details:", error);
    res.status(500).json({ error: "Error fetching employee details" });
  }
});

// Create work details
router.post("/workDetails/:empId", async (req, res) => {
  const empId = req.params.empId;
  const {
    workEmail,
    workPhone,
    department,
    location,
    designation,
    supervisor,
  } = req.body;

  try {
    const newWorkDetails = {
      empId,
      workEmail,
      workPhone,
      department,
      location,
      designation,
      supervisor,
    };

    const [results] = await pool.query(
      "INSERT INTO workdetails (empId, workEmail, workPhone, department, location, designation, supervisor) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        newWorkDetails.empId,
        newWorkDetails.workEmail,
        newWorkDetails.workPhone,
        newWorkDetails.department,
        newWorkDetails.location,
        newWorkDetails.designation,
        newWorkDetails.supervisor,
      ]
    );

    res.status(201).json({
      message: "Employee Work Details Created successfully",
      employeeId: results.insertId,
    });
  } catch (error) {
    console.error("Error saving employee work data:", error);
    res.status(500).json({ error: "Error saving employee work data" });
  }
});

// Update work details
router.put("/workDetails/:empId", async (req, res) => {
  const empId = req.params.empId;
  const {
    workEmail,
    workPhone,
    department,
    location,
    designation,
    supervisor,
  } = req.body;

  try {
    const updateWorkDetails = {
      workEmail,
      workPhone,
      department,
      location,
      designation,
      supervisor,
    };

    // Build the SET part of the query dynamically
    let query = "UPDATE workdetails SET ";
    let values = [];
    for (let key in updateWorkDetails) {
      if (updateWorkDetails[key]) {
        query += `${key} = ?, `;
        values.push(updateWorkDetails[key]);
      }
    }

    // Remove the trailing comma and space
    query = query.slice(0, -2);
    query += " WHERE empId = ?";

    // Add the empId as the last value for the WHERE condition
    values.push(empId);

    const [results] = await pool.query(query, values);

    if (results.affectedRows > 0) {
      res.status(200).json({
        message: "Employee work details updated successfully",
      });
    } else {
      res.status(404).json({
        message: "Employee not found or no changes made",
      });
    }
  } catch (error) {
    console.error("Error updating employee work data:", error);
    res.status(500).json({ error: "Error updating employee work data" });
  }
});

// Get employee by id
router.get("/getEmployee/:empId", async (req, res) => {
  const employeeId = req.params.empId;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM logindetails WHERE empId = ?",
      [employeeId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ message: "Employee not found" });
    }
  } catch (error) {
    console.error("Error fetching employee details:", error);
    res.status(500).json({ error: "Error fetching employee details" });
  }
});

// Get employee work details by id
router.get("/getWorkDetails/:empId", async (req, res) => {
  const employeeId = req.params.empId;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM workdetails WHERE empId = ?",
      [employeeId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ message: "Work details not found" });
    }
  } catch (error) {
    console.error("Error fetching work details:", error);
    res.status(500).json({ error: "Error fetching work details" });
  }
});

// Save personal details
router.post("/savePersonalDetails/:empId", async (req, res) => {
  const { empId } = req.params;
  const {
    name,
    email,
    phone,
    emergency_contact,
    address,
    date_of_birth,
    gender,
    country,
    marital_status,
    dependents,
  } = req.body;

  try {
    const [existing] = await pool.query(
      "SELECT * FROM personaldetails WHERE empId = ?",
      [empId]
    );

    if (existing.length > 0) {
      // Update existing record
      await pool.query(
        "UPDATE personaldetails SET name = ?, email = ?, phone = ?, emergency_contact = ?, address = ?, date_of_birth = ?, gender = ?, country = ?, marital_status = ?, dependents = ? WHERE empId = ?",
        [
          name,
          email,
          phone,
          emergency_contact,
          address,
          date_of_birth,
          gender,
          country,
          marital_status,
          dependents,
          empId,
        ]
      );
      return res.json({ message: "Personal details updated successfully" });
    } else {
      // Insert new record
      await pool.query(
        "INSERT INTO personaldetails (empId, name, email, phone, emergency_contact, address, date_of_birth, gender, country, marital_status, dependents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          empId,
          name,
          email,
          phone,
          emergency_contact,
          address,
          date_of_birth,
          gender,
          country,
          marital_status,
          dependents,
        ]
      );
      return res
        .status(201)
        .json({ message: "Personal details created successfully" });
    }
  } catch (error) {
    console.error("Error saving personal details:", error);
    return res.status(500).json({ message: "Error saving personal details" });
  }
});

// Get personal details by ID
router.get("/getPersonalDetails/:empId", async (req, res) => {
  const employeeId = req.params.empId;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM personaldetails WHERE empId = ?",
      [employeeId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ message: "Personal details not found" });
    }
  } catch (error) {
    console.error("Error fetching Personal details:", error);
    res.status(500).json({ error: "Error fetching Personal details" });
  }
});

//upload profile image
initializeApp(config.firebaseConfig);
const storage = getStorage();
const upload = multer({ storage: multer.memoryStorage() });

function giveCurrentDateTime() {
  return new Date().toISOString().replace(/:/g, "-");
}

//save profile pic
router.post(
  "/uploadProfileImage/:empId",
  upload.single("profilePic"),
  async (req, res) => {
    const empId = req.params.empId;

    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded.");
      }

      const dateTime = giveCurrentDateTime();
      const storageRef = ref(
        storage,
        `profilepic/${req.file.originalname} ${dateTime}`
      );
      const metadata = {
        contentType: req.file.mimetype,
      };

      const snapshot = await uploadBytesResumable(
        storageRef,
        req.file.buffer,
        metadata
      );
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update profile picture URL in the database
      const updateQuery =
        "UPDATE personaldetails SET profilepic = ? WHERE empId = ?";
      await pool.query(updateQuery, [downloadURL, empId]);

      return res.send({
        message:
          "File uploaded to Firebase Storage and profile picture updated successfully",
        name: req.file.originalname,
        type: req.file.mimetype,
        downloadURL: downloadURL,
      });
    } catch (error) {
      console.error("Error uploading file or updating profile picture:", error);
      return res.status(500).send(error.message);
    }
  }
);

//get profile pic
router.get("/getProfileImage/:empId", async (req, res) => {
  const empId = req.params.empId;

  try {
    const [rows] = await pool.query(
      "SELECT profilepic FROM personaldetails WHERE empId = ?",
      [empId]
    );

    if (rows.length > 0) {
      res.status(200).json({ imageUrl: `${rows[0].profilepic}` });
    } else {
      res.status(404).json({ message: "Employee not found" });
    }
  } catch (error) {
    console.error("Error fetching profile image:", error);
    res.status(500).json({ error: "Error fetching profile image" });
  }
});

//add experinces
router.post("/experience/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { date_from, date_to, company, role } = req.body;

  try {
    const newExperience = { empId, date_from, date_to, company, role };

    const [results] = await pool.query(
      "INSERT INTO experience (empId, date_from, date_to, company, role) VALUES (?, ?, ?, ?, ?)",
      [
        newExperience.empId,
        newExperience.date_from,
        newExperience.date_to,
        newExperience.company,
        newExperience.role,
      ]
    );

    res.status(201).json({
      message: "Employee experience created successfully",
      employeeId: results.insertId,
    });
  } catch (error) {
    console.error("Error saving employee experience:", error);
    res.status(500).json({ error: "Error saving employee experience" });
  }
});

//get experience by id
router.get("/getexperience/:empId", async (req, res) => {
  const employeeId = req.params.empId;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM experience WHERE empId = ?",
      [employeeId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows); // Return all experience records
    } else {
      res.status(404).json({ message: "Experience details not found" });
    }
  } catch (error) {
    console.error("Error fetching experience details:", error);
    res.status(500).json({ error: "Error fetching experience details" });
  }
});

//update experience
router.put("/updateExperience/:empId/:expId", async (req, res) => {
  const empId = req.params.empId;
  const expId = req.params.expId;
  const { date_from, date_to, company, role } = req.body;

  try {
    const [results] = await pool.query(
      "UPDATE experience SET date_from = ?, date_to = ?, company = ?, role = ? WHERE empId = ? AND id = ?",
      [date_from, date_to, company, role, empId, expId]
    );

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Experience not found" });
    }

    // Fetch the updated experience
    const [updatedExperience] = await pool.query(
      "SELECT * FROM experience WHERE id = ?",
      [expId]
    );

    res.status(200).json(updatedExperience[0]); // Return the updated experience
  } catch (error) {
    console.error("Error updating employee experience:", error);
    res.status(500).json({ error: "Error updating employee experience" });
  }
});

//delete experience
router.delete("/deleteExperience/:empId/:expId", async (req, res) => {
  const empId = req.params.empId;
  const expId = req.params.expId;

  try {
    const [result] = await pool.query(
      "DELETE FROM experience WHERE empId = ? and id = ?",
      [empId, expId]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Experience deleted successfully." });
    } else {
      res.status(404).json({ message: "Experience not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

//add education
router.post("/education/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { date_from, date_to, institution, degree } = req.body;

  try {
    const newEducation = { empId, date_from, date_to, institution, degree };

    const [results] = await pool.query(
      "INSERT INTO education (empId, date_from, date_to, institution, degree) VALUES (?, ?, ?, ?, ?)",
      [
        newEducation.empId,
        newEducation.date_from,
        newEducation.date_to,
        newEducation.institution,
        newEducation.degree,
      ]
    );

    res.status(201).json({
      message: "Employee education created successfully",
      employeeId: results.insertId,
    });
  } catch (error) {
    console.error("Error saving employee education:", error);
    res.status(500).json({ error: "Error saving employee education" });
  }
});

//get education by id
router.get("/getEducation/:empId", async (req, res) => {
  const employeeId = req.params.empId;

  try {
    const [rows] = await pool.query("SELECT * FROM education WHERE empId = ?", [
      employeeId,
    ]);

    if (rows.length > 0) {
      res.status(200).json(rows);
    } else {
      res.status(404).json({ message: "Education details not found" });
    }
  } catch (error) {
    console.error("Error fetching education details:", error);
    res.status(500).json({ error: "Error fetching education details" });
  }
});

//update education
router.put("/updateEducation/:empId/:eduId", async (req, res) => {
  const empId = req.params.empId;
  const eduId = req.params.eduId;
  const { date_from, date_to, institution, degree } = req.body;

  try {
    const [results] = await pool.query(
      "UPDATE education SET date_from = ?, date_to = ?, institution = ?, degree = ? WHERE empId = ? AND id = ?",
      [date_from, date_to, institution, degree, empId, eduId]
    );

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "education not found" });
    }

    // Fetch the updated education
    const [updatedEducation] = await pool.query(
      "SELECT * FROM education WHERE id = ?",
      [eduId]
    );

    res.status(200).json(updatedEducation[0]);
  } catch (error) {
    console.error("Error updating employee education:", error);
    res.status(500).json({ error: "Error updating employee education" });
  }
});

//delete education
router.delete("/deleteEducation/:empId/:eduId", async (req, res) => {
  const empId = req.params.empId;
  const eduId = req.params.eduId;

  try {
    const [result] = await pool.query(
      "DELETE FROM education WHERE empId = ? and id = ?",
      [empId, eduId]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Education deleted successfully." });
    } else {
      res.status(404).json({ message: "Education not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

//save support details
router.post("/support/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { email, subject, message } = req.body;

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Create a new contact entry
    const newSupport = { empId, email, subject, message };

    const [results] = await pool.query(
      "INSERT INTO support (empId, email, subject, message) VALUES (?, ?, ?, ?)",
      [
        newSupport.empId,
        newSupport.email,
        newSupport.subject,
        newSupport.message,
      ]
    );

    // Respond with the newly created support entry and query result
    res.status(201).json({
      message: "Support entry created successfully",
      support: newSupport,
      supportId: results.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/requestPasswordReset", async (req, res) => {
  try {
    const { empId, email } = req.body;

    if (!empId && !email) {
      return res
        .status(400)
        .json({ message: "Please provide either employee ID or email." });
    }

    // Query the database using either empId or email
    let query = "";
    let queryParam = "";

    if (empId) {
      query = "SELECT * FROM logindetails WHERE empId = ?";
      queryParam = empId;
    } else if (email) {
      query = "SELECT * FROM logindetails WHERE email = ?";
      queryParam = email;
    }

    const [rows] = await pool.query(query, [queryParam]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const employee = rows[0];

    // Generate a random 6-digit code
    const resetCode = crypto.randomInt(100000, 999999);

    // Save the reset code and its expiration time (you'll need to adjust this part for your DB model)
    const resetCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

    await pool.query(
      "UPDATE logindetails SET resetcode = ?, resetcodeexpires = ? WHERE empId = ?",
      [resetCode, resetCodeExpires, employee.empId]
    );

    // Send the reset code via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: employee.email,
      subject: "Password Reset Request",
      text: `Your password reset code is ${resetCode}. It will expire in 15 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset code sent to email" });
  } catch (error) {
    console.error("Error requesting password reset:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

//reset password
router.post("/resetPassword", async (req, res) => {
  try {
    const { resetCode, newPassword } = req.body;

    // Fetch the user with the given reset code
    const [rows] = await pool.query(
      "SELECT * FROM logindetails WHERE resetcode = ?",
      [resetCode]
    );

    // If no user is found with the reset code
    if (rows.length === 0) {
      return res.status(404).json({ message: "Reset code not found" });
    }

    const user = rows[0];

    // Check if the reset code is expired
    if (new Date(user.resetCodeExpires) < Date.now()) {
      return res.status(400).json({ message: "Reset code has expired" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and clear the reset code fields
    await pool.query(
      "UPDATE logindetails SET password = ?, resetcode = NULL, resetcodeexpires = NULL WHERE empId = ?",
      [hashedPassword, user.empId]
    );

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

//request leave
router.post("/requestLeave/:empId", async (req, res) => {
  const empId = req.params.empId;
  const {
    leave_type,
    date_from,
    date_to,
    time_from,
    time_to,
    description,
    status,
  } = req.body;
  const createdAt = new Date();

  try {
    const newLeave = {
      empId,
      leave_type,
      date_from,
      date_to,
      time_from,
      time_to,
      description,
      status,
      createdAt,
    };

    const [results] = await pool.query(
      "INSERT INTO leave_requests (empId, leave_type, date_from, date_to, time_from, time_to, description, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        newLeave.empId,
        newLeave.leave_type,
        newLeave.date_from,
        newLeave.date_to,
        newLeave.time_from,
        newLeave.time_to,
        newLeave.description,
        newLeave.status,
        newLeave.createdAt,
      ]
    );

    res.status(201).json({
      message: "Employee leave created successfully",
      leaveId: results.insertId,
    });
  } catch (error) {
    console.error("Error saving employee leave:", error);
    res.status(500).json({ error: "Error saving employee leave" });
  }
});

//get leave request by id
router.get("/getLeaveRequest/:empId", async (req, res) => {
  const employeeId = req.params.empId;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM leave_requests WHERE empId = ?",
      [employeeId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows);
    } else {
      res.status(404).json({ message: "Leave details not found" });
    }
  } catch (error) {
    console.error("Error fetching leave details:", error);
    res.status(500).json({ error: "Error fetching leave details" });
  }
});

//delete leave request
router.delete("/deleteLeave/:empId/:leaveId", async (req, res) => {
  const leaveId = req.params.leaveId;
  const empId = req.params.empId;

  try {
    // Get the leave request's creation time
    const [leave] = await pool.query(
      "SELECT createdAt FROM leave_requests WHERE empId = ? and id = ?",
      [empId, leaveId]
    );

    if (!leave.length) {
      return res.status(404).json({ error: "Leave request not found" });
    }
    await pool.query("DELETE FROM leave_requests WHERE empId = ? AND id = ?", [
      empId,
      leaveId,
    ]);
    res.status(200).json({ message: "Leave request deleted successfully" });
  } catch (error) {
    console.error("Error deleting leave request:", error);
    res.status(500).json({ error: "Error deleting leave request" });
  }
});

//get leave analysis by empId
router.get("/leaveAnalysis/:empId", async (req, res) => {
  const employeeId = req.params.empId;

  try {
    const [rows] = await pool.query(
      `SELECT leave_type, 
                    COUNT(*) AS total_leaves, 
                    SUM(TIMESTAMPDIFF(HOUR, CONCAT(date_from, ' ', time_from), CONCAT(date_to, ' ', time_to))) AS total_hours,
                    SUM(DATEDIFF(date_to, date_from) + 1) AS total_days
             FROM leave_requests 
             WHERE empId = ? 
             GROUP BY leave_type`,
      [employeeId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows);
    } else {
      res.status(404).json({ message: "No leave data found" });
    }
  } catch (error) {
    console.error("Error fetching leave analysis:", error);
    res.status(500).json({ error: "Error fetching leave analysis" });
  }
});

//attendance
router.post("/attendance/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { punch_in_time, punch_out_time, note } = req.body;
  const createdAt = new Date();
  const currentDate = createdAt.toISOString().split("T")[0];

  try {
    const [existingRecord] = await pool.query(
      "SELECT * FROM attendance WHERE empId = ? AND punch_in_date = ?",
      [empId, currentDate]
    );

    if (existingRecord.length > 0) {
      const updatedRecord = await pool.query(
        "UPDATE attendance SET punch_out_time = ?, note = ? WHERE empId = ? AND punch_in_date = ?",
        [punch_out_time, note, empId, currentDate]
      );

      return res.status(200).json({
        message: "Employee attendance updated successfully",
        attendanceId: existingRecord[0].attendanceId,
      });
    } else {
      const newAttendance = {
        empId,
        punch_in_date: currentDate,
        punch_out_date: currentDate,
        punch_in_time,
        punch_out_time,
        note,
        createdAt,
      };
      const [results] = await pool.query(
        "INSERT INTO attendance (empId, punch_in_date, punch_out_date, punch_in_time, punch_out_time, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          newAttendance.empId,
          newAttendance.punch_in_date,
          newAttendance.punch_out_date,
          newAttendance.punch_in_time,
          newAttendance.punch_out_time,
          newAttendance.note,
          newAttendance.createdAt,
        ]
      );

      return res.status(201).json({
        message: "Employee attendance created successfully",
        attendanceId: results.insertId,
      });
    }
  } catch (error) {
    console.error("Error saving employee attendance:", error);
    res.status(500).json({ error: "Error saving employee attendance" });
  }
});

// Get attendance records by empId
const moment = require("moment");

router.get("/getAttendance/:empId", async (req, res) => {
  const empId = req.params.empId;

  try {
    // Get all attendance records for the employee
    const [records] = await pool.query(
      "SELECT punch_in_date, punch_in_time, punch_out_time FROM attendance WHERE empId = ?",
      [empId]
    );

    // Calculate worked hours for each record
    const attendanceWithWorkedHours = records.map((record) => {
      if (record.punch_in_time && record.punch_out_time) {
        // Use moment.js to calculate the difference between punch in and punch out times
        const punchIn = moment(record.punch_in_time, "HH:mm:ss");
        const punchOut = moment(record.punch_out_time, "HH:mm:ss");

        // Calculate worked hours as the duration between punch in and punch out times
        const workedHours = moment.duration(punchOut.diff(punchIn)).asHours();

        return {
          ...record,
          worked_hours: workedHours.toFixed(2),
        };
      } else {
        return {
          ...record,
          worked_hours: "N/A",
        };
      }
    });

    res.status(200).json(attendanceWithWorkedHours);
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    res.status(500).json({ error: "Error fetching employee attendance" });
  }
});

//get attendance analysis by empId
router.get("/attendanceAnalysis/:empId", async (req, res) => {
  const empId = req.params.empId;

  try {
    // Query to get worked hours for the week (grouped by day of the week)
    const weekQuery = `
            SELECT 
                DAYNAME(punch_in_date) AS dayOfWeek, 
                ROUND(SUM(TIMESTAMPDIFF(MINUTE, punch_in_time, punch_out_time)) / 60, 2) AS workedHours
            FROM attendance
            WHERE empId = ? 
            AND WEEK(punch_in_date) = WEEK(CURDATE())
            GROUP BY dayOfWeek;
        `;
    const [weekData] = await pool.query(weekQuery, [empId]);

    // Query to get total hours worked per month
    const monthQuery = `
            SELECT 
                MONTHNAME(punch_in_date) AS month, 
                ROUND(SUM(TIMESTAMPDIFF(MINUTE, punch_in_time, punch_out_time)) / 60, 2) AS workedHours
            FROM attendance
            WHERE empId = ? 
            GROUP BY month
            ORDER BY MONTH(punch_in_date);
        `;
    const [monthData] = await pool.query(monthQuery, [empId]);

    // Sending the response with both week and month data
    return res.status(200).json({
      weekData,
      monthData,
    });
  } catch (error) {
    console.error("Error fetching attendance analysis:", error);
    return res
      .status(500)
      .json({ error: "Error fetching attendance analysis" });
  }
});

//get attendance of current date
router.get("/getCurrentDateAttendance/:empId", async (req, res) => {
  const empId = req.params.empId;

  try {
    const [records] = await pool.query(
      "SELECT punch_in_time, punch_out_time FROM attendance WHERE empId = ? AND punch_in_date = CURDATE()",
      [empId]
    );

    if (records.length > 0) {
      res.status(200).json(records[0]);
    } else {
      res.status(200).json({ punch_in_time: null, punch_out_time: null });
    }
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    res.status(500).json({ error: "Error fetching today's attendance" });
  }
});

router.get("/attendanceCountByDepartment", async (req, res) => {
  try {
    const query = `
      SELECT 
        w.department,
        COUNT(DISTINCT a.empId) AS present_count
      FROM attendance a
      JOIN workdetails w ON a.empId = w.empId
      WHERE a.punch_in_date = CURDATE()
      GROUP BY w.department;
    `;

    const [results] = await pool.query(query);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching department-wise attendance count:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

//pay roll assistance
router.post("/payrollAssistance/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { date, subject, description } = req.body;

  try {
    const newAssistance = {
      empId,
      date,
      subject,
      description,
    };

    const [results] = await pool.query(
      "INSERT INTO payroll_assistance (empId, date, subject, description) VALUES (?, ?, ?, ?)",
      [
        newAssistance.empId,
        newAssistance.date,
        newAssistance.subject,
        newAssistance.description,
      ]
    );

    res.status(201).json({
      message: "Employee payroll assistance created successfully",
      assistanceId: results.insertId,
    });
  } catch (error) {
    console.error("Error saving employee payroll assistance:", error);
    res.status(500).json({ error: "Error saving employee payroll assistance" });
  }
});

// Route to get all financial requests
router.get("/getFinancialRequests", async (req, res) => {
  try {
    const query = "SELECT * FROM financial_requests ORDER BY created_at DESC";
    const [results] = await pool.query(query);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching financial requests:", error);
    res.status(500).json({ error: "Failed to fetch financial requests." });
  }
});

//financial request
router.post(
  "/financialRequest/:empId",
  upload.single("financialAttachment"),
  async (req, res) => {
    const empId = req.params.empId;
    const { request_type, date_of_request, amount, reason, repayment_terms } =
      req.body;
    let downloadURL = null;

    try {
      // Check if there's an attachment to upload
      if (req.file) {
        const dateTime = giveCurrentDateTime();
        const storageRef = ref(
          storage,
          `attachment/${req.file.originalname} ${dateTime}`
        );
        const metadata = { contentType: req.file.mimetype };

        const snapshot = await uploadBytesResumable(
          storageRef,
          req.file.buffer,
          metadata
        );
        downloadURL = await getDownloadURL(snapshot.ref);
      }

      // Insert financial request into the database
      const query = `
      INSERT INTO financial_requests (empId, request_type, date_of_request, amount, reason, repayment_terms, attachment) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
      await pool.query(query, [
        empId,
        request_type,
        date_of_request,
        amount,
        reason,
        repayment_terms || null,
        downloadURL,
      ]);

      res.status(201).json({
        message: `${
          request_type === "loan" ? "Loan" : "Salary advance"
        } request submitted successfully.`,
        attachmentURL: downloadURL,
      });
    } catch (error) {
      console.error(
        "Error submitting financial request or uploading attachment:",
        error
      );
      res.status(500).json({ error: "Failed to submit financial request." });
    }
  }
);

// get financial requests by empId
router.get("/getFinancialRequests/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { request_type } = req.query;

  try {
    let query = `SELECT * FROM financial_requests WHERE empId = ?`;
    const queryParams = [empId];

    // Optionally filter by request type
    if (request_type) {
      query += ` AND request_type = ?`;
      queryParams.push(request_type);
    }

    query += ` ORDER BY created_at DESC`;
    const [results] = await pool.query(query, queryParams);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching financial requests:", error);
    res.status(500).json({ error: "Failed to fetch financial requests." });
  }
});

// Route to update a financial request by id
router.put("/updateFinancialRequest/:id", async (req, res) => {
  const requestId = req.params.id;
  const {
    request_type,
    date_of_request,
    amount,
    reason,
    repayment_terms,
    status,
  } = req.body;

  try {
    // Build the query to update the financial request
    let query = `
      UPDATE financial_requests 
      SET request_type = ?, 
          date_of_request = ?, 
          amount = ?, 
          reason = ?, 
          repayment_terms = ?, 
          status = ?
      WHERE id = ?
    `;

    const queryParams = [
      request_type,
      date_of_request,
      amount,
      reason,
      repayment_terms || null,
      status || "pending", // Default status to 'pending' if not provided
      requestId,
    ];

    // Execute the query to update the financial request
    const [result] = await pool.query(query, queryParams);

    // Check if the request was updated successfully
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Financial request not found." });
    }

    res.status(200).json({
      message: "Financial request updated successfully.",
    });
  } catch (error) {
    console.error("Error updating financial request:", error);
    res.status(500).json({ error: "Failed to update financial request." });
  }
});

// Route to update the status of a financial request by ID
router.put("/updateFinancialRequestStatus/:id", async (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body;

  try {
    // Validate the input status
    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    // Build the query to update only the status
    const query = `
      UPDATE financial_requests 
      SET status = ? 
      WHERE id = ?
    `;

    const queryParams = [status, requestId];

    // Execute the query to update the status
    const [result] = await pool.query(query, queryParams);

    // Check if the request was updated successfully
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Financial request not found." });
    }

    res.status(200).json({
      message: "Financial request status updated successfully.",
    });
  } catch (error) {
    console.error("Error updating financial request status:", error);
    res
      .status(500)
      .json({ error: "Failed to update financial request status." });
  }
});

//add certifications and achievements
router.post("/addCertificate/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { certificate_name, link, status } = req.body;

  try {
    const newCertificate = {
      empId,
      certificate_name,
      link,
      status,
    };

    const [results] = await pool.query(
      "INSERT INTO certificates_achievements (empId, certificate_name, link, status) VALUES (?, ?, ?, ?)",
      [
        newCertificate.empId,
        newCertificate.certificate_name,
        newCertificate.link,
        newCertificate.status,
      ]
    );

    res.status(201).json({
      message: "Employee certificate created successfully",
      assistanceId: results.insertId,
    });
  } catch (error) {
    console.error("Error saving employee certificate:", error);
    res.status(500).json({ error: "Error saving employee certificate" });
  }
});

//get cerficates by empId
router.get("/getCertificates/:empId", async (req, res) => {
  const empId = req.params.empId;

  try {
    const [records] = await pool.query(
      "SELECT * FROM certificates_achievements WHERE empId = ?",
      [empId]
    );

    if (records.length > 0) {
      res.status(200).json(records);
    } else {
      res.status(404).json("No certificates found");
    }
  } catch (error) {
    res.status(500).json({ error: "Error fetching certificates" });
  }
});

//add reminders by empId
router.post("/addReminders/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { date, reminder, subject } = req.body;

  try {
    await pool.query(
      "INSERT INTO reminders (empId, date, reminder, subject) VALUES (?, ?, ?, ?)",
      [empId, date, reminder, subject]
    );
    res.status(201).json({ message: "Reminder added successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error adding reminder" });
  }
});

//get reminders by empId and current date
router.get("/getReminders/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { date, subject } = req.query;

  try {
    const [results] = await pool.query(
      "SELECT * FROM reminders WHERE empId = ? AND date = ? AND subject = ?",
      [empId, date, subject]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving reminders" });
  }
});

//get all reminders by empId
router.get("/getAllReminders/:empId", async (req, res) => {
  const empId = req.params.empId;
  const { date } = req.query;

  try {
    const [results] = await pool.query(
      "SELECT * FROM reminders WHERE empId = ? AND date = ?",
      [empId, date]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving reminders" });
  }
});
// Get all strategic insights
router.get("/strategic-insights", async (req, res) => {
  try {
    // Define your query to fetch data from the `strategic_insights` table
    const [results] = await pool.query("SELECT * FROM strategic_insights");

    // Return the fetched data as JSON
    res.status(200).json(results);
  } catch (error) {
    // Handle errors and respond with a status code and message
    console.error("Error retrieving strategic insights:", error);
    res.status(500).json({ error: "Error retrieving strategic insights" });
  }
});
router.get("/revenue", async (req, res) => {
  try {
    // Query to fetch data from the `revenue` table
    const [results] = await pool.query("SELECT * FROM revenue_with_targets");

    // Return the fetched data as JSON
    res.status(200).json(results);
  } catch (error) {
    // Handle errors and respond with a status code and message
    console.error("Error retrieving revenue data:", error);
    res.status(500).json({ error: "Error retrieving revenue data" });
  }
});
router.post("/revenue", async (req, res) => {
  try {
    // Destructure values from req.body
    const {
      Department,
      Date,
      "Product Sales": productSales,
      "Service Income": serviceIncome,
      Discounts,
      "Net Revenue": netRevenue,
      "Revenue Target": revenueTarget,
      Variance,
    } = req.body;

    // SQL query to insert data into the revenue table
    const query = `
      INSERT INTO revenue_with_targets (Department, Date, \`Product Sales\`, \`Service Income\`, Discounts, \`Net Revenue\`, \`Revenue Target\`, Variance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Execute the query using pool.query and pass the correct values
    const [result] = await pool.query(query, [
      Department,
      Date,
      productSales,
      serviceIncome,
      Discounts,
      netRevenue,
      revenueTarget,
      Variance,
    ]);

    // Send a response with the inserted data
    res.status(201).json({
      Department,
      Date,
      "Product Sales": productSales,
      "Service Income": serviceIncome,
      Discounts,
      "Net Revenue": netRevenue,
      "Revenue Target": revenueTarget,
      Variance,
    });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ error: "Error inserting data" });
  }
});
router.put("/revenue/:department/:date", async (req, res) => {
  const { department, date } = req.params;
  const {
    "Product Sales": productSales,
    "Service Income": serviceIncome,
    Discounts,
    "Net Revenue": netRevenue,
    "Revenue Target": revenueTarget,
    Variance,
  } = req.body;

  try {
    // SQL query to update revenue data based on department and date
    const query = `
      UPDATE revenue_with_targets
      SET 
        \`Product Sales\` = ?,
        \`Service Income\` = ?,
        Discounts = ?,
        \`Net Revenue\` = ?,
        \`Revenue Target\` = ?,
        Variance = ?
      WHERE Department = ? AND Date = ?
    `;

    // Execute the query using pool.query
    const [result] = await pool.query(query, [
      productSales,
      serviceIncome,
      Discounts,
      netRevenue,
      revenueTarget,
      Variance,
      department, // Assuming 'Department' is unique
      date, // Assuming 'Date' is unique
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "No matching record found to update" });
    }

    // Send a response with the updated data
    res.status(200).json({
      department,
      date,
      "Product Sales": productSales,
      "Service Income": serviceIncome,
      Discounts,
      "Net Revenue": netRevenue,
      "Revenue Target": revenueTarget,
      Variance,
    });
  } catch (error) {
    console.error("Error updating revenue data:", error.message);
    res
      .status(500)
      .json({ error: "Error updating revenue data", details: error.message });
  }
});
router.get("/profit", async (req, res) => {
  try {
    // Query to fetch data from the `profit` table
    const [results] = await pool.query("SELECT * FROM profit_table");
    res.status(200).json(results);
  } catch (error) {
    console.error("Error retrieving profit data:", error);
    res.status(500).json({ error: "Error retrieving profit data" });
  }
});
// Insert Profit Data
router.post("/profit", async (req, res) => {
  const {
    Department,
    Date,
    Revenue,
    COGS,
    OperatingExpenses,
    GrossProfit,
    NetProfit,
    ProfitMargin,
  } = req.body;

  try {
    const query = `
      INSERT INTO profit_table (\`Department\`, \`Date\`, \`Revenue\`, \`Cost of Goods Sold (COGS)\`, \`Operating Expenses\`, \`Gross Profit\`, \`Net Profit\`, \`Profit Margin\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.query(query, [
      Department,
      Date,
      Revenue,
      COGS,
      OperatingExpenses,
      GrossProfit,
      NetProfit,
      ProfitMargin,
    ]);

    res.status(201).json({ message: "Profit data added successfully." });
  } catch (error) {
    console.error("Error inserting profit data:", error);
    res.status(500).json({ error: "Error inserting profit data." });
  }
});

// Update Profit Data
router.put("/profit/:department/:date", async (req, res) => {
  const { department, date } = req.params;
  const {
    Revenue,
    COGS,
    OperatingExpenses,
    GrossProfit,
    NetProfit,
    ProfitMargin,
  } = req.body;

  const query = `
    UPDATE profit_table
    SET 
      \`Revenue\` = ?, 
      \`Cost of Goods Sold (COGS)\` = ?, 
      \`Operating Expenses\` = ?, 
      \`Gross Profit\` = ?, 
      \`Net Profit\` = ?, 
      \`Profit Margin\` = ?
    WHERE 
      \`Department\` = ? AND \`Date\` = ?
  `;

  const values = [
    Revenue,
    COGS,
    OperatingExpenses,
    GrossProfit,
    NetProfit,
    ProfitMargin,
    department,
    date,
  ];

  try {
    const [results] = await pool.query(query, values);
    if (results.affectedRows === 0) {
      return res.status(404).send("Profit data not found");
    }
    res.json({ message: "Profit data updated successfully" });
  } catch (error) {
    console.error("Error updating profit data:", error);
    res.status(500).send("Error updating profit data");
  }
});

router.get("/expenses", async (req, res) => {
  try {
    // Query to fetch data from the `expenses_data` table
    const [results] = await pool.query("SELECT * FROM expenses_data");

    // Return the fetched data as JSON
    res.status(200).json(results);
  } catch (error) {
    // Handle errors and respond with a status code and message
    console.error("Error retrieving expenses data:", error);
    res.status(500).json({ error: "Error retrieving expenses data" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    // Destructure values from req.body
    const {
      Department,
      Date,
      "Operational Costs": operationalCosts,
      Marketing,
      "Research & Development": researchAndDevelopment,
      Miscellaneous,
    } = req.body;

    // SQL query to insert data into the expenses_data table
    const query = `
      INSERT INTO expenses_data (Department, Date, \`Operational Costs\`, Marketing, \`Research & Development\`, Miscellaneous)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    // Execute the query using pool.query and pass the correct values
    const [result] = await pool.query(query, [
      Department,
      Date,
      operationalCosts,
      Marketing,
      researchAndDevelopment,
      Miscellaneous,
    ]);

    // Send a response with the inserted data
    res.status(201).json({
      Department,
      Date,
      "Operational Costs": operationalCosts,
      Marketing,
      "Research & Development": researchAndDevelopment,
      Miscellaneous,
    });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ error: "Error inserting data" });
  }
});

router.put("/expenses/:department/:date", async (req, res) => {
  const { department, date } = req.params;
  const {
    "Operational Costs": operationalCosts,
    Marketing,
    "Research & Development": researchAndDevelopment,
    Miscellaneous,
  } = req.body;

  try {
    // SQL query to update expenses data based on department and date
    const query = `
      UPDATE expenses_data
      SET 
        \`Operational Costs\` = ?,
        Marketing = ?,
        \`Research & Development\` = ?,
        Miscellaneous = ?
      WHERE Department = ? AND Date = ?
    `;

    // Execute the query using pool.query
    const [result] = await pool.query(query, [
      operationalCosts,
      Marketing,
      researchAndDevelopment,
      Miscellaneous,
      department, // Assuming 'Department' is unique
      date, // Assuming 'Date' is unique
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "No matching record found to update" });
    }

    // Send a response with the updated data
    res.status(200).json({
      department,
      date,
      "Operational Costs": operationalCosts,
      Marketing,
      "Research & Development": researchAndDevelopment,
      Miscellaneous,
    });
  } catch (error) {
    console.error("Error updating expenses data:", error.message);
    res
      .status(500)
      .json({ error: "Error updating expenses data", details: error.message });
  }
});

//get total revenue
router.get("/total-revenue/last-quarter", async (req, res) => {
  try {
    // Query to fetch the total revenue sum (last 3 months or all data if none in 3 months)
    const query = `
      SELECT 
        SUM(\`Product Sales\` + \`Service Income\` - Discounts) AS totalRevenue
      FROM 
        revenue_with_targets
      WHERE 
        Date >= (
          CASE 
            WHEN EXISTS (
              SELECT 1 
              FROM revenue_with_targets 
              WHERE Date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            ) 
            THEN DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            ELSE '0000-01-01' -- Include all data if no recent data exists
          END
        )
    `;

    // Execute the query
    const [results] = await pool.query(query);

    // Extract total revenue from the result
    const totalRevenue = results[0]?.totalRevenue || 0;

    // Response
    res.status(200).json({
      message: "Total revenue fetched successfully.",
      totalRevenue,
    });
  } catch (error) {
    console.error("Error fetching total revenue:", error.message);
    res.status(500).json({
      message: "Error fetching total revenue.",
      error: error.message,
    });
  }
});

// Route to get the average profit margin
router.get("/avg-profit-margin", async (req, res) => {
  try {
    const query = `
      SELECT Department, 
             AVG(\`Profit Margin\`) AS avg_profit_margin
      FROM profit_table 
      WHERE Date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01') 
            AND Date < DATE_FORMAT(CURDATE(), '%Y-%m-01')
      GROUP BY Department
    `;

    // Execute the query and get the results
    const [results] = await pool.query(query);

    if (results.length === 0) {
      return res.status(404).json({
        message: "No profit margin data available for the last month.",
      });
    }

    // Send the average profit margin for each department
    res.status(200).json({
      message: "Average profit margin for the last month fetched successfully.",
      data: results,
    });
  } catch (error) {
    console.error(
      "Error fetching average profit margin for last month:",
      error.message
    );
    res.status(500).json({
      message: "Error fetching average profit margin for last month.",
      error: error.message,
    });
  }
});

const uploadCvToFirebase = async (file) => {
  if (!file) return null;

  const dateTime = giveCurrentDateTime();
  const storageRef = ref(storage, `resumes/${file.originalname} ${dateTime}`);
  const metadata = { contentType: file.mimetype };

  const snapshot = await uploadBytesResumable(
    storageRef,
    file.buffer,
    metadata
  );
  return await getDownloadURL(snapshot.ref);
};

// Nodemailer Example - Send Notification Email
router.post("/sendEmail", async (req, res) => {
  const { email, subject, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text: message,
    });

    res.status(200).json({ message: "Email sent successfully." });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email." });
  }
});

module.exports = router;
