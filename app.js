const morgan = require('morgan');
const config = require("./config.json");
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var sqlite3 = require("sqlite3").verbose();
const cors = require('cors');
const { request } = require('http');
var nodemailer = require('nodemailer');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

Date.prototype.addDays = function (days) {
  const date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

let db = new sqlite3.Database('db.sqlite3', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the database');
});

const transporter = nodemailer.createTransport({
  port: 465,
  host: "smtp.gmail.com",
  auth: {
    user: 'admnamrita@gmail.com',
    pass: 'thisisadmin',
  },
  secure: true,
});

app.post("/login", async function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var option = req.body.option;
  if (option === "student") {
    console.log("student");
    db.all(`SELECT password FROM info_student WHERE Rollno='${username}'`, (err, row) => {
      if (err) {
        console.log(err.message);
      }
      else if (row[0] != null) {
        console.log("record found");
        if (password === row[0].password) {
          res.status(200).json({ message: username })
        }
        else {
          res.status(401).json({ message: 'Invalid creds' })
        }
      }
      else {
        console.log("Record not found");
        res.status(401).json({ message: 'Invalid creds' })
      }
    });
  }
  else if (option === "faculty") {
    console.log("faculty");
    db.all(`SELECT password FROM info_teacher WHERE id='${username}'`, (err, row) => {
      if (err) {
        console.log(err.message);
      }
      else if (row[0] != null) {
        console.log("record found");
        if (password === row[0].password) {
          res.status(200).json({ message: username })
        }
        else {
          res.status(401).json({ message: 'Invalid creds' })
        }
      }
      else {
        console.log("Record not found");
        res.status(401).json({ message: 'Invalid creds' })
      }
    });
  }
  else if (option === "admin") {
    console.log("admin");
    if (password === config.adminpassword) {
      res.status(200).json({ message: 'Successfully Logged in' })
    }
    else {
      res.status(401).json({ message: 'Invalid creds' })
    }
  }
})

app.get("/student/:username", async function (req, res) {
  console.log(req.params.username);
  db.all(`SELECT name,Rollno,Email,DOB,class_id FROM info_student WHERE Rollno = '${req.params.username}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      var class_id = row[0].class_id;
      db.all(`SELECT Course_id FROM info_timetable WHERE Class_id='${class_id}' ORDER BY timeslot,day`, (err1, t) => {
        if (err1) {
          console.log(err1);
        }
        else {
          console.log(t[0].Course_id);
          var i, j;
          var d = new Date();
          var da = d;
          var y = d.toISOString();
          var x = y.split('T')[0];
          var bbc = da.addDays(6);
          var bbg = bbc.toISOString();
          var bbt = bbg.split('T')[0];
          var room = new Array(8);
          for (i = 0; i < 9; i++) {
            room[i] = new Array(6);
          }
          for (i = 0; i < 9; i++) {
            for (j = 0; j < 6; j++) {
              room[i][j] = "-";
            }
          }
          let ti = { "09:00 AM": 0, "10:00 AM": 1, "11:00 AM": 2, "12:00 PM": 3, "01:00 PM": 4, "02:00 PM": 5, "03:00 PM": 6, "04:00 PM": 7, "05:00 PM": 8 };
          db.all(`SELECT date,time,room_id,Course_id FROM info_event WHERE (date>= '${x}' AND date<='${bbt}') AND (Class_id='${class_id}' OR Course_id='Special Event!')`, (err2, r) => {
            if (err2) {
              console.log(err2);
            }
            else {
              console.log("hello sir");
              for (i = 0; i < r.length; i++) {
                var k = r[i].date;
                var ik;
                var re = k.split('-')
                var date = parseInt(re[2])
                var year = parseInt(re[0])
                var mon = parseInt(re[1])
                var month = new Array(12)
                month[0] = 31;
                month[1] = 28;
                month[2] = 31;
                month[3] = 30;
                month[4] = 31;
                month[5] = 30;
                month[6] = 31;
                month[7] = 31;
                month[8] = 30;
                month[9] = 31;
                month[10] = 30;
                month[11] = 31;
                var s = 0;
                if ((year % 400 == 0) || ((year % 4 == 0) && (year % 100 != 0))) {
                  month[1] = 29;
                }
                for (ik = 0; ik < mon - 1; ik++) {
                  s = s + month[ik];
                }
                s = s + (date + year + (year / 4) - 2);
                console.log(s)
                var ss = s % 7;
                var sx = Math.floor(ss)
                var w=sx;
                var z = r[i].time;
                var u = ti[z];
                let tit = { "09:00 AM": 0, "10:00 AM": 6, "11:00 AM": 12, "12:00 PM": 18, "01:00 PM": 24, "02:00 PM": 30, "03:00 PM": 36, "04:00 PM": 42, "05:00 PM": 48 };
                let ind = (w-1)+tit[r[i].time];
                room[u][w-1] = r[i].room_id;
                t[ind].Course_id = r[i].Course_id;
              }
              res.render("std-index.ejs", { student: row[0], t: t, room: room });
            }
          })
        }
      })
    }
  });
})

app.get("/sprofile/:username", async function (req, res) {
  console.log(req.params.username);
  db.all(`SELECT name,Rollno,Email,DOB FROM info_student WHERE Rollno = '${req.params.username}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      console.log(row[0]);
      res.render("std-profile.ejs", { student: row[0] });
    }
  });
})

app.post("/schange/:username", async function (req, res) {
  console.log(req.params.username);
  var { npass } = req.body;
  db.run(`UPDATE info_student SET password=? WHERE Rollno=?`, [npass, req.params.username], function (err) {
    if (err) {
      console.log(err.message)
    }
    else {
      const path = require('path');
      res.sendFile(path.join(__dirname, '/login.html'));
    }
  })
})

app.get("/sbook/:username", async function (req, res) {
  console.log(req.params.username);
  db.all(`SELECT name,Rollno,Email,DOB FROM info_student WHERE Rollno = '${req.params.username}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      console.log(row[0]);
      res.render("std-book.ejs", { student: row[0] });
    }
  });
})

app.get("/faculty/:username", async function (req, res) {
  console.log(req.params.username);
  db.all(`SELECT id,name,gender,Email,DOB FROM info_teacher WHERE id = '${req.params.username}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      var klm;
      var tx = new Array(54);
      for(klm=0;klm<54;klm++){
        tx[klm]=" ";
      }
      db.all(`SELECT Course_id,timeslot,day FROM info_timetable WHERE faculty_id='${req.params.username}' ORDER BY timeslot,day`, (err1, t) => {
        if (err1) {
          console.log(err1);
        }
        else {
          console.log(t.length);
          var i, j;
          var d = new Date();
          var da = d;
          var y = d.toISOString();
          var x = y.split('T')[0];
          var bbc = da.addDays(6);
          var bbg = bbc.toISOString();
          var bbt = bbg.split('T')[0];
          var room = new Array(8);
          for (i = 0; i < 9; i++) {
            room[i] = new Array(6);
          }
          for (i = 0; i < 9; i++) {
            for (j = 0; j < 6; j++) {
              room[i][j] = "-";
            }
          }
          let ti = { "09:00 AM": 0, "10:00 AM": 1, "11:00 AM": 2, "12:00 PM": 3, "01:00 PM": 4, "02:00 PM": 5, "03:00 PM": 6, "04:00 PM": 7, "05:00 PM": 8 };
          db.all(`SELECT date,time,room_id,Course_id FROM info_event WHERE (date>= '${x}' AND date<='${bbt}') AND Organizer_id='${req.params.username}'`, (err2, r) => {
            if (err2) {
              console.log(err2);
            }
            else {
              console.log("hello sir");
              var irl;
              let tit1 = { "a09": 0, "a10": 6, "a11": 12, "a12": 18, "f1": 24, "f2": 30, "f3": 36, "f4": 42, "f5": 48 };
                let tit2 = { "1m": 0, "2t": 1, "3w": 2, "4h": 3, "5f": 4, "6s": 5 };
                console.log(t);
                for(irl=0;irl<t.length;irl++){
                  let ind1=tit1[t[irl].timeslot]+tit2[t[irl].day];
                  tx[ind1]=t[irl].Course_id;
                }
              for (i = 0; i < r.length; i++) {
                var k = r[i].date;
                var ik;
                var re = k.split('-')
                var date = parseInt(re[2])
                var year = parseInt(re[0])
                var mon = parseInt(re[1])
                var month = new Array(12)
                month[0] = 31;
                month[1] = 28;
                month[2] = 31;
                month[3] = 30;
                month[4] = 31;
                month[5] = 30;
                month[6] = 31;
                month[7] = 31;
                month[8] = 30;
                month[9] = 31;
                month[10] = 30;
                month[11] = 31;
                var s = 0;
                if ((year % 400 == 0) || ((year % 4 == 0) && (year % 100 != 0))) {
                  month[1] = 29;
                }
                for (ik = 0; ik < mon - 1; ik++) {
                  s = s + month[ik];
                }
                s = s + (date + year + (year / 4) - 2);
                console.log(s)
                var ss = s % 7;
                var sx = Math.floor(ss)
                var w=sx;
                var z = r[i].time;
                var u = ti[z];
                let tit = { "09:00 AM": 0, "10:00 AM": 6, "11:00 AM": 12, "12:00 PM": 18, "01:00 PM": 24, "02:00 PM": 30, "03:00 PM": 36, "04:00 PM": 42, "05:00 PM": 48 };
                let ind = (w-1)+tit[r[i].time];
                room[u][w-1] = r[i].room_id;
                tx[ind] = r[i].Course_id;
              }
              res.render("teach-index.ejs", { teacher: row[0], t: tx, room: room });
            }
          })
        }
      })
    }
  });
})

app.get("/tprofile/:username", async function (req, res) {
  console.log(req.params.username);
  db.all(`SELECT name,id,Email,DOB FROM info_teacher WHERE id = '${req.params.username}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      console.log(row[0]);
      res.render("teach-profile.ejs", { teacher: row[0] });
    }
  });
})

app.post("/tchange/:username", async function (req, res) {
  console.log(req.params.username);
  var { tnpass } = req.body;
  db.run(`UPDATE info_teacher SET password=? WHERE id=?`, [tnpass, req.params.username], function (err) {
    if (err) {
      console.log(err.message)
    }
    else {
      const path = require('path');
      res.sendFile(path.join(__dirname, '/login.html'));
    }
  })
})

app.get("/tbook/:username", async function (req, res) {
  console.log(req.params.username);
  db.all(`SELECT name,id,Email,DOB FROM info_teacher WHERE id = '${req.params.username}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      console.log(row[0]);
      res.render("teach-book.ejs", { teacher: row[0] });
    }
  });
})

app.get("/tcancel/:username", async function (req, res) {
  console.log(req.params.username);
  var d = new Date();
  var y = d.toISOString()
  var x = y.split('T')[0]
  var ct = d.toLocaleTimeString()
  db.all(`SELECT name,id,Email,DOB FROM info_teacher WHERE id = '${req.params.username}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      console.log(row[0]);
      db.all(`SELECT Class_id,Course_id,room_id,time,date,id FROM info_event WHERE (Organizer_id = '${req.params.username}' AND date>='${x}')`, (err1, row1) => {
        if (err1) {
          console.log(err1.message);
        }
        else {
          console.log(row1[0]);
          res.render("cancelation-list.ejs", { teacher: row[0], events: row1 });
        }
      })
    }
  });
})

app.get("/tcancel", async function (req, res) {
  console.log(req.query.fid);
  var d = new Date();
  var y = d.toISOString()
  var x = y.split('T')[0]
  var ct = d.toLocaleTimeString()
  db.all(`SELECT name,id,Email,DOB FROM info_teacher WHERE id = '${req.query.fid}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      console.log(row[0]);
      db.all(`SELECT Class_id,Course_id,room_id,time,date,id FROM info_event WHERE (Organizer_id = '${req.query.fid}' AND date>='${x}')`, (err1, row1) => {
        if (err1) {
          console.log(err1.message);
        }
        else {
          console.log(row1[0]);
          res.render("cancelation-list.ejs", { teacher: row[0], events: row1 });
        }
      })
    }
  });
})

app.get("/tbook", async function (req, res) {
  var fid = req.query.fid
  console.log(fid);
  db.all(`SELECT name,id,Email,DOB FROM info_teacher WHERE id = '${fid}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      console.log(row[0]);
      res.render("teach-book.ejs", { teacher: row[0] });
    }
  });
})

app.get("/admin", async function (req, res) {
  let scount = 0;
  let rcount = 0;
  db.all(`SELECT count(*) scount FROM info_student `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      scount = row[0].scount;
    }
  });
  db.all(`SELECT count(*) rcount FROM info_request `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      rcount = row[0].rcount;
    }
  });
  db.all(`SELECT count(*) tcount FROM info_teacher `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      let tcount = row[0].tcount;
      res.render("index.ejs", { scount: scount, rcount: rcount, tcount: tcount });
    }
  });
})

app.post("/ttable", async function (req, res) {
  var data = req.body;
  var a = ["1m", "2t", "3w", "4h", "5f", "6s"]
  var b = ["a09", "a10", "a11", "a12", "f1", "f2", "f3", "f4", "f5"]
  var c = ["m", "t", "w", "h", "f", "s"]
  var d = ["9", "10", "11", "12", "1", "2", "3", "4", "5"]
  var e = ["om", "ot", "ow", "oh", "of", "os"]
  var Class_id = data["Classid"]
  db.run(`DELETE FROM info_timetable WHERE Class_id=? `, [Class_id], function (err) {
    if (err) {
      console.log(err.message)
    }
    else {
      var i, j;
      for (i = 0; i < b.length; i++) {
        for (j = 0; j < a.length; j++) {
          var x = c[j] + d[i];
          var kl = e[j] + d[i];
          db.run(`INSERT INTO info_timetable(Class_id,timeslot,day,Course_id,faculty_id) VALUES(?,?,?,?,?) `, [Class_id, b[i], a[j], data[x], data[kl]], function (err1) {
            if (err1) {
              console.log(err1.message);
            }
            else {
              console.log("Inserted!!");
            }
          })
        }
      }
      let scount = 0;
      let rcount = 0;
      db.all(`SELECT count(*) scount FROM info_student `, (err2, row) => {
        if (err2) {
          console.log(err2.message);
        }
        else {
          scount = row[0].scount;
        }
      });
      db.all(`SELECT count(*) rcount FROM info_request `, (err2, row) => {
        if (err2) {
          console.log(err2.message);
        }
        else {
          rcount = row[0].rcount;
        }
      });
      db.all(`SELECT count(*) tcount FROM info_teacher `, (err2, row) => {
        if (err2) {
          console.log(err2.message);
        }
        else {
          let tcount = row[0].tcount;
          res.render("index.ejs", { scount: scount, rcount: rcount, tcount: tcount });
        }
      });
    }
  })
})

app.get("/dashboard", async function (req, res) {
  let stcount = 0;
  let rcount = 0;
  db.all(`SELECT count(*) scount FROM info_student `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      stcount = row[0].scount;
    }
  });
  db.all(`SELECT count(*) rcount FROM info_request `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      rcount = row[0].rcount;
    }
  });
  db.all(`SELECT count(*) tcount FROM info_teacher `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      let tecount = row[0].tcount;
      res.render("index.ejs", { scount: stcount, rcount: rcount, tcount: tecount });
    }
  });
})

app.get("/slist", async function (req, res) {
  db.all(`SELECT name,Rollno,Email,DOB FROM info_student `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      res.render("students-list.ejs", { students: row })
    }
  });
})

app.get("/rlist", async function (req, res) {
  db.all(`SELECT Roomno,Capacity,block,Floor,Projector,Internet FROM info_room `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      res.render("room-list.ejs", { rooms: row })
    }
  });
})

app.get("/flist", async function (req, res) {
  db.all(`SELECT name,id,Email,DOB FROM info_teacher `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      res.render("teachers-list.ejs", { faculties: row })
    }
  });
})

app.get("/olist", async function (req, res) {
  db.all(`SELECT name,Rollno,Email,DOB FROM info_student `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      res.render("students-list.ejs", { students: row })
    }
  });
})

app.get("/alist", async function (req, res) {
  var d = new Date();
  var y = d.toISOString()
  var x = y.split('T')[0]
  db.all(`SELECT Rollno,Description,date,Capacity,timeslot,Projector,Internet,id FROM info_request WHERE date>='${x}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      res.render("appointment-list.ejs", { requests: row })
    }
  });
})

app.post("/approve", async function (req, res) {
  var { rollno, date, Description, Capacity, timeslot, Projector, Internet, id } = req.body;
  console.log(rollno);
  console.log(date);
  var Course_id = "Special Event!"
  var Class_id = null
  db.all(`SELECT * FROM info_room WHERE (Capacity>='${Capacity}' AND Roomno NOT IN(SELECT room_id FROM info_event WHERE date=='${date}' AND time=='${timeslot}')) AND (Projector='${Projector}' AND Internet='${Internet}') `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      res.render("admin-room.ejs", { rooms: row, rollno: rollno, Course_id: Course_id, Class_id: Class_id, date: date, Description: Description, Capacity: Capacity, timeslot: timeslot, Projector: Projector, Internet: Internet, id: id })
    }
  });
})

app.get("/adroom", async function (req, res) {
  var rollno = req.query.rollno;
  var date = req.query.date;
  var Description = req.query.Description;
  var Capacity = req.query.Capacity;
  var timeslot = req.query.timeslot;
  var Course_id = req.query.Course_id;
  var Class_id = req.query.Class_id;
  var Projector = req.query.Projector;
  var Internet = req.query.Internet;
  var id = req.query.id;
  console.log(timeslot);
  db.all(`SELECT * FROM info_room WHERE (Capacity>='${Capacity}' AND Roomno NOT IN(SELECT room_id FROM info_event WHERE date=='${date}' AND time=='${timeslot}')) AND (Projector='${Projector}' AND Internet='${Internet}') `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      res.render("admin-room.ejs", { rooms: row, rollno: rollno, Course_id: Course_id, Class_id: Class_id, date: date, Description: Description, Capacity: Capacity, timeslot: timeslot, Projector: Projector, Internet: Internet, id: id })
    }
  });
})

app.post("/confroom", async function (req, res) {
  var { rollno, Roomno, Course_id, Class_id, date, Description, Capacity, timeslot, id } = req.body;
  console.log(rollno);
  db.run(`INSERT INTO info_event('Capacity','Description','Class_id','Course_id','Organizer_id','room_id','time','date') VALUES(?,?,?,?,?,?,?,?)`, [Capacity, Description, Class_id, Course_id, rollno, Roomno, timeslot, date], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      db.run(`DELETE FROM info_request WHERE id=? `, [id], function (err1) {
        if (err1) {
          console.log(err1.message);
          res.status(401).json({ message: 'Error!' })
        }
        else {
          console.log("Deleted");
          res.status(200).json({ message: 'Deleted!' })
        }
      });
      console.log("Inserted");
    }
  });
})

app.post("/faccont/:username", async function (req, res) {
  var { date1, Course_id, Class_id, radio, radiop, radioi, capacity, radioFruit } = req.body;
  console.log(Course_id)
  console.log(Class_id)
  console.log(date1)
  console.log(radio)
  console.log(capacity)
  console.log(radioFruit)
  db.all(`SELECT * FROM info_room WHERE (Capacity>='${capacity}' AND Roomno NOT IN(SELECT room_id FROM info_event WHERE date=='${date1}' AND time=='${radioFruit}')) AND (Projector='${radiop}' AND Internet='${radioi}') `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      db.get(`SELECT name,id FROM info_teacher WHERE id=? `, [req.params.username], (err1, row1) => {
        if (err1) {
          console.log(err1.message);
        }
        else {
          console.log(row1);
          res.render("faculty-room.ejs", { rooms: row, faculty: row1, Course_id: Course_id, Class_id: Class_id, date1: date1, radio: radio, capacity: capacity, time: radioFruit })
        }
      });
    }
  });
})

app.post("/sreq", async function (req, res) {
  var { date, radio1, radiop1, radioi1, capacity1, sroll, var1 } = req.body;
  console.log(date);
  console.log(capacity1);
  console.log(var1);
  db.run(`INSERT INTO info_request('Rollno','Description','date','Capacity','timeslot','Projector','Internet') VALUES(?,?,?,?,?,?,?)`, [sroll, radio1, date, capacity1, var1, radiop1, radioi1], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      console.log("Inserted");
      res.status(200).json({ message: 'Inserted!' })
    }
  });
})

app.get("/sbook", async function (req, res) {
  var sroll = req.query.sroll;
  console.log(sroll);
  db.all(`SELECT name,Rollno,Email,DOB FROM info_student WHERE Rollno = '${sroll}' `, (err, row) => {
    if (err) {
      console.log(err.message);
    }
    else {
      console.log(row[0]);
      res.render("std-book.ejs", { student: row[0] });
    }
  });
})


app.get("/addt", async function (req, res) {
  res.render("add-teacher.ejs")
})

app.get("/addr", async function (req, res) {
  res.render("add-room.ejs")
})

app.get("/addc", async function (req, res) {
  res.render("add-course.ejs")
})

app.get("/adds", async function (req, res) {
  res.render("add-student.ejs")
})

app.get("/logout", async function (req, res) {
  res.render("login.ejs")
})

app.get("/", async function (req, res) {
  res.render("login.ejs")
})

app.post("/addstud", async function (req, res) {
  var { name, Rollno, Email, password, gender, DOB, Class_id } = req.body;
  db.run(`INSERT INTO info_student VALUES(?,?,?,?,?,?,?)`, [name, Rollno, Email, password, gender, DOB, Class_id], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      console.log("Inserted");
      res.status(200).json({ message: 'Inserted!' })
    }
  });
})

app.post("/addteach", async function (req, res) {
  console.log("hmmm");
  var { name, id, Email, password, gender, DOB } = req.body;
  db.run(`INSERT INTO info_teacher VALUES(?,?,?,?,?,?)`, [id, name, gender, Email, password, DOB], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      console.log("Inserted");
      res.status(200).json({ message: 'Inserted!' })
    }
  });
})

app.post("/addroom", async function (req, res) {
  console.log("hmmm");
  var { Roomno, Capacity, block, Floor, Projector, Internet } = req.body;
  db.run(`INSERT INTO info_room VALUES(?,?,?,?,?,?)`, [Roomno, Capacity, block, Floor, Projector, Internet], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      console.log("Inserted");
      res.status(200).json({ message: 'Inserted!' })
    }
  });
})


app.post("/addcourse", async function (req, res) {
  console.log("hmmm");
  var { id, name, sname } = req.body;
  db.run(`INSERT INTO info_course VALUES(?,?,?)`, [id, name, sname], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      console.log("Inserted");
      res.status(200).json({ message: 'Inserted!' })
    }
  });
})

app.post("/delteach", async function (req, res) {
  var { fid } = req.body
  console.log(fid)
  db.run(`DELETE FROM info_teacher WHERE id=?`, [fid], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      console.log("Deleted");
      res.status(200).json({ message: 'Deleted!' })
    }
  });
})

app.post("/delstud", async function (req, res) {
  var { sid } = req.body
  console.log(sid)
  db.run(`DELETE FROM info_student WHERE Rollno=?`, [sid], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      console.log("Deleted");
      res.status(200).json({ message: 'Deleted!' })
    }
  });
})

app.post("/deleve", async function (req, res) {
  var i;
  var { sid } = req.body
  console.log(sid)
  console.log("Deleted");
  db.get(`SELECT Class_id,Course_id,date,time FROM info_event WHERE id=? `, [sid], (err1, row1) => {
    if (err1) {
      console.log(err1.message);
    }
    else {
      var msg;
      console.log(row1.Course_id);
      msg = "The event " + row1.Course_id + " which was supposed to happen on " + row1.date + " has been cancelled!!";
      console.log(row1);
      db.all(`SELECT Email FROM info_student WHERE class_id=? `, [row1.Class_id], (err2, row2) => {
        if (err2) {
          console.log(err2.message);
        }
        else {
          console.log(row2[0]);
          db.run(`DELETE FROM info_event WHERE id=?`, [sid], function (err) {
            if (err) {
              console.log(err.message);
              res.status(401).json({ message: 'Error!' })
            }
            else {
              for (i = 0; i < row2.length; i++) {
                const mailData = {
                  from: 'admnamrita@gmail.com',
                  to: row2[i].Email,
                  subject: 'Cancellation of Event.',
                  text: msg
                };
                transporter.sendMail(mailData, function (err3, info) {
                  if (err3)
                    console.log(err3)
                  else
                    console.log(info);
                });
              }
              res.status(200).json({ message: 'Deleted!' })
            }
          });
        }
      });
    }
  });
})

app.post("/delroom", async function (req, res) {
  var { sid } = req.body
  console.log(sid)
  db.run(`DELETE FROM info_room WHERE Roomno=?`, [sid], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      console.log("Deleted");
      res.status(200).json({ message: 'Deleted!' })
    }
  });
})

app.post("/facroom", async function (req, res) {
  var { fid, Roomno, Course_id, Class_id, date1, radio, capacity, time } = req.body
  console.log(fid)
  console.log(Roomno)
  console.log(Course_id)
  console.log(Class_id)
  console.log(date1)
  console.log(radio)
  console.log(capacity)
  console.log(time)
  db.run(`INSERT INTO info_event(Capacity,Description,Class_id,Course_id,Organizer_id,room_id,time,date) VALUES(?,?,?,?,?,?,?,?)`, [capacity, radio, Class_id, Course_id, fid, Roomno, time, date1], function (err) {
    if (err) {
      console.log(err.message);
      res.status(401).json({ message: 'Error!' })
    }
    else {
      console.log("Success");
      res.status(200).json({ message: 'Successful' })
    }
  });
})

app.listen(process.env.PORT||3000, function () {
  console.log("Server Running at 3000");
})
