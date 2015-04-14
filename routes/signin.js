var express = require('express');
var router = express.Router();
var db_manager = require('../resources/js/db_manager.js');

/* GET sign in page. */
//I know this isn't exactly adhering to REST, but I'm just trying this out
router.post('/', function(req, res, next) {
    var username, password;
    
    try {
        username = db_manager.checkInvalidInput(req.body.username);
        password = db_manager.checkInvalidInput(req.body.password);
        
//        var db_conn = db_manager.createConnectionToDB();
//        var session_user_id = db_manager.signIn(db_conn, username, password);
//        res.render('home', { username: username } ); //render home page with their username to show they're logged in
    }
    catch(e) {
        res.render('index', { message: e.message });
    }
});

module.exports = router;