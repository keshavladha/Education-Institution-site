const express=require("express")
const app=express();
const port=8080;
const mysql = require('mysql2');
const path = require("path"); 
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'student',
    password: '#Keshav24'
});

app.listen(port,()=>{
    console.log("Server Is listening")
})

app.get("/",(req,res)=>{
    res.render("index")
})

app.post("/contact", (req, res) => {
    const { name, email, phone, message } = req.body;

    const query = "INSERT INTO data (name, email, phone, message) VALUES (?, ?, ?, ?)";
    connection.query(query, [name, email, phone, message], (err, result) => {
        if (err) {
            console.error("❌ DB Insert Error:", err);
            return res.send("Error saving data: " + err.message);
        }
        res.redirect("/")
       
        
    });
});

app.post("/payfees", (req, res) => {
    const { studentName, class: studentClass, fatherName, course, amount } = req.body;

    const query = `
        INSERT INTO payments (student_name, class, father_name, course, amount)
        VALUES (?, ?, ?, ?, ?)
    `;

    connection.query(query, [studentName, studentClass, fatherName, course, amount], (err, result) => {
        if (err) {
            console.error("❌ DB Insert Error:", err);
            return res.send("Error saving payment data: " + err.message);
        }
        res.send("✅ Payment details saved successfully!");
    });
});

app.get("/year",(req,res)=>{
    res.render("year")
})



app.get("/payment",(req,res)=>{
    res.render("payment")
})

