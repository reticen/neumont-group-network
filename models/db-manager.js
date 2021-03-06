//Manage database connections and perform operations
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var util = require('util');

//Connection pool
var pool = mysql.createPool({
    host: 'localhost',
    user: 'admin',
    password: 'QFpExCtT8zS5MnuZ',
    database: 'ngn-db',
    connectionLimit: 10
});

//user: 'ngn-user',
//password: 'zJ7m9cdujSGrSvAq'


// =========== Utility ===========

//Get a DB connection from the pool and give it to a callback
var getConnection = function(callback) {
    pool.getConnection(function onConnectionRetrieval(err, conn) {
        if(!err) {
            callback(null, conn);
        }
        else {
            return callback(err, null);
        }
    });
}

//Generate a new hash for a password
var generateNewHash = function(password_to_hash) {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password_to_hash, salt);
}

//Encode UTF-8 string to Base64
var encodeString = function(string) {
//    return btoa(unescape(encodeURIComponent(string)));
    return new Buffer(string).toString('base64');
}

//Decode Base64 string to UTF-8
var decodeString = function(string) {
//    return decodeURIComponent(escape(atob(string)));
    return new Buffer(string, 'base64'); // Ta-da
}

var mysql_real_escape_string = function(str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
}


// =========== Sign In/Registration ===========

//Register a new user
exports.registerNewUser = function(username, password, email, userAvatar, callback) {
    var hashedPassword = generateNewHash(password);
    
    getConnection(function onConnect(err, connection) {
        if(!err) {
            if(!userAvatar) {
                userAvatar = null;
            }

            connection.query('INSERT INTO `users`(`username`, `password`, `email`, `avatar_path`) VALUES (\'' 
                             + username + '\', \'' + hashedPassword + '\', \'' + email + '\', \'' + userAvatar + '\')', function onDBInsertUser(err, result) {
                if(!err) {
                    callback(null, result.insertId);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        console.log('Releasing connection..');
        connection.release();
    });
}

//Authenticate a user
exports.authenticate = function(username, password, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM users where username=\'' + username + '\' LIMIT 1', function onDBUserRetrieval(err, rows, fields) {
                //if user exists
                if(rows[0]) {
                    var user;

                    if(bcrypt.compareSync(password, rows[0].password)) {
                        user = { userId: rows[0].user_id, username: username, email: rows[0].email, userAvatar: rows[0].avatar_path };
                        console.log('Inside db avatar path: ' + rows[0].avatar_path);
                    }
                    else {
                        user = null;
                    }

                    callback(err, user);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

// =========== Users ===========

//Get a single user's details
exports.getUserDetails = function(requestedId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM users where user_id=\'' + requestedId + '\' LIMIT 1', function onDBUserRetrieval(err, rows, fields) {
                //If user exists
                if(rows[0]) {
                    var user = { userId: rows[0].user_id, username: rows[0].username, email: rows[0].email, userAvatar: rows[0].avatar_path };
                    
                    console.log('Inside db avatar path: ' + rows[0].avatar_path);
                    callback(err, user);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

exports.getListOfUserDetails = function(requestedIDs, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM users', function onDBUserListRetrieval(err, rows, fields) {
                //If user exists
                if(rows) {
                    var listOfUsers = [];
                    for(var id in requestedIDs) {
                        for(var i = 0; i < rows.length; i++) {
                            if(rows[i].user_id === requestedIDs[id]) {
                                listOfUsers.push({ userId: rows[i].user_id, username: rows[i].username, email: rows[i].email });
                                i = rows.length; //Break out of loop early in a "safe" way 
                            }
                        }
                    }

                    callback(err, listOfUsers);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Get a user by username
exports.getUserByName = function(username, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM users where username=\'' + username + '\'', function onUserRetrieval(err, rows, fields) {
                callback(err, rows[0]);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Edit a user's details
exports.editUserDetails = function(newPassword, newEmail, userId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            var hashedPassword = generateNewHash(newPassword);
            connection.query('UPDATE `users` SET `password`=\'' + 
                             hashedPassword + '\', `email`=\'' + newEmail + '\' WHERE `user_id`=\'' + userId + '\'', function(err, result) {
                callback(err, result);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Remove a user from the database
exports.deleteUser = function(userId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('DELETE FROM users where user_id=\'' + userId + '\'', function(err, result) {
                console.log('Deleted ' + result.affectedRows + ' rows');
                callback(err, result);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

exports.changeUserAvatar = function(userId, avatarPath, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            var uploadPath = '../' + avatarPath;
            connection.query('UPDATE `users` SET `avatar_path`=\'' + uploadPath + '\' WHERE `user_id`=\'' + userId + '\'', function(err, result) {
                callback(err, result.insertId);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}


// =========== Organizations ===========

//Get an organization's information based off of ID
exports.getOrganization = function(requestedId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM organizations where organization_id=\'' + requestedId + '\' LIMIT 1', function onDBOrgRetrieval(err, rows, fields) {
                callback(err, rows[0]);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Get all organizations
exports.getAllOrganizations = function(callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM organizations', function onDBOrgRetrieval(err, rows, fields) {
                callback(err, rows);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

exports.getAllOrgsUserIsMemberOf = function(userId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT organizations.* from organizations LEFT JOIN `members` on organizations.organization_id = members.org_id', function onDBOrgRetrieval(err, rows, fields) {
                if(!err) {
                    callback(err, rows);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Add a new organization
exports.addNewOrganization = function(orgName, orgDesc, authorId, orgImagePath, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            var escapedName = mysql_real_escape_string(orgName);
            var escapedDesc = mysql_real_escape_string(orgDesc);
            var uploadPath = '../' + orgImagePath;
            // console.log('Inside db manager, before final upload path: ' + orgImagePath);
            // console.log('Inside db manager, final upload path: ' + uploadPath);
            connection.query('INSERT INTO `organizations`(`name`, `description`, `original_author_id`, `org_image_path`) VALUES (\'' 
                             + escapedName + '\', \'' + escapedDesc + '\', \'' + authorId + '\', \'' + uploadPath + '\')', function onDBInsertOrg(err, result) {
                //If insert was successful
                if(result) {
                    callback(err, result.insertId);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}


//Edit an organization's information
exports.editOrganization = function(orgId, newOrgName, newOrgDesc, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('UPDATE `organizations` SET `name`=\'' + 
                             newOrgName + '\', `description`=\'' + newOrgDesc + '\' WHERE `organization_id`=\'' + orgId + '\'', function(err, result) {
                //If update was successful
                if(result) {
                    callback(err, result.insertId);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//To be implemented: pass in multiple keywords or tags
//Get a list of organizations based on a keyword
exports.getListOfOrgsByOneKeyword = function(keyword, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM organizations where name like \'\%' + keyword + '\%\'', function(err, rows, fields) {
                if(!err) {
                    if(rows) {
                        var searchResults = [];
                        for(var key in rows) {
                            searchResults.push({ orgId: rows[key].organization_id, orgName: rows[key].name, orgDesc: rows[key].description });
                        }
                        
                        callback(null, searchResults);
                    }
                    else {
                        callback(null, null);
                    }
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}


// =========== Members ===========

//Get all members of an organization based on organization ID
exports.getOrgMembers = function(orgId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM members where org_id = \'' + orgId + '\'', function onDBMembersRetrieval(err, rows, fields) {
                callback(err, rows);
            });
        }
        else {
            throw err;
        }

        connection.release();
    });
}

//Get list of usernames, user IDs, and user emails from org ID in members table
exports.getOrgMemberDetails = function(orgId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT users.user_id, users.username, users.avatar_path FROM users INNER JOIN members ON members.member_id = users.user_id WHERE members.org_id = \'' + orgId + '\'', function onDBMembersRetrieval(err, rows, fields) {
                callback(err, rows);
            });
        }
        else {
            throw err;
        }

        connection.release();
    });
}

//Add a new member of an organization
exports.addNewOrgMember = function(orgId, userId, isAdmin, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            isAdmin = (isAdmin === true) ? 1 : 0;
            
            connection.query('INSERT INTO `members`(`org_id`, `member_id`, `is_admin`) VALUES (\'' 
                             + orgId + '\', \'' + userId + '\', \'' + isAdmin + '\')', function onOrgMemberInsert(err, result) {
                callback(err, result);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Remove a user from an organization's list of members
exports.removeOrgMember = function(orgId, userId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('DELETE FROM members where member_id=\'' + userId + '\' AND org_id=\'' + orgId + '\'', function onMemberRemoval(err, result) {
                callback(err, result);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Get a member's admin status
exports.getIsMemberAdmin = function(orgId, userId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT is_admin FROM members where member_id=\'' + userId + '\' AND org_id=\'' + orgId + '\' LIMIT 1', function onIsAdminRetrieval(err, rows, fields) {
                if(rows[0]) {
                    callback(null, rows[0].is_admin);
                }
                else {
                    callback(null, false);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Check if user is a member of an organization
exports.isMemberOfOrg = function(orgId, userId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT member_id FROM members where member_id=\'' + userId + '\' AND org_id=\'' + orgId + '\' LIMIT 1', function onRetrieval(err, rows, fields) {
                if(rows[0]) {
                    callback(err, true);
                }
                else {
                    callback(err, false);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}


// =========== Events ===========

exports.getAllEvents = function(callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM events', function onDBEventInsert(err, rows, fields) {
                if(rows[0]) {
                    callback(err, rows[0]);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

exports.getAllEventsUserIsAttending = function(userId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT events.* FROM events LEFT JOIN `organizations` on events.org_id = organizations.organization_id', function onDBEventInsert(err, rows, fields) {
                if(rows) {
                    callback(err, rows);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Get an event's details
exports.getEventDetails = function(eventId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM events where event_id=\'' + eventId + '\' LIMIT 1', function onDBEventInsert(err, rows, fields) {
                if(rows[0]) {
                    var canUsersComment = rows[0].can_users_comment ? true : false;
                    rows[0].can_users_comment = canUsersComment;
                    callback(err, rows[0]);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Add a new event
exports.addNewEvent = function(eventTitle, eventDesc, eventStartDate, orgId, canUsersComment, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            var convertedCanUsersComment = canUsersComment ? 1 : 0;
            connection.query('INSERT INTO `events`(`title`, `description`, `start_date`, `org_id`, `can_users_comment`) VALUES (\'' +
                                eventTitle + '\', \'' + eventDesc + '\', \'' + eventStartDate + '\', \'' + orgId + '\', \'' + convertedCanUsersComment + '\')', function onDBEventInsert(err, result) {
                callback(err, result.insertId);
            });
        }
        else {
            throw err;
        }

        connection.release();
    });
}

//Edit an event
exports.editEventDetails = function(newEventTitle, newEventDesc, newEventStartDate, eventId, canUsersComment, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            var convertedCanUsersComment = canUsersComment ? 1 : 0;
            connection.query('UPDATE `events` SET `title`=\'' + newEventTitle + '\', `description`=\'' + 
                             newEventDesc + '\', `start_date`=\'' + newEventStartDate + '\', `can_users_comment`=\'' +
                                convertedCanUsersComment + '\' WHERE `event_id`=\'' + eventId + '\'', function onUpdateEvent(err, result) {
                callback(err, result);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Get all events posted to a specific organization
exports.retrieveAllEventsByOrgId = function(orgId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM events where org_id=\'' + orgId + '\'', function onRetrieveEventsByOrgId(err, rows, fields) {
                callback(err, rows);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Change a user's attendance status to an event
exports.changeAttendanceStatus = function(userId, eventId, isAttending, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('INSERT INTO `attendees`(`is_attending`, `user_id`, `event_id`) VALUES (\'' 
                             + isAttending + '\', \'' + userId + '\', \'' + eventId + '\')', function onChangeAttendanceStatus(err, rows, fields) {
                callback(err, rows);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Get a list of comments posted to a particular event
exports.getComments = function(eventId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM comments INNER JOIN users ON '
                             + 'comments.comment_author_id = users.user_id '
                             + ' where event_id=\'' + eventId + '\'', function onRetrieveCommentList(err, rows, fields) {
                var listOfComments = [];
                for(var result in rows) {
                    // var decodedComment = decodeString(rows[result].message);
                    // listOfComments.push({ userId: rows[result].user_id, username: rows[result].username, userAvatar: rows[result].avatar_path, 
                    //                         message: decodedComment, timePosted: rows[result].time_posted });
                    listOfComments.push({ userId: rows[result].user_id, username: rows[result].username, userAvatar: rows[result].avatar_path, 
                                            message: rows[result].message, timePosted: rows[result].time_posted });
                }
                callback(err, listOfComments);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Add a new comment
exports.addComment = function(userId, eventId, comment, callback) {
    var encodedComment = encodeString(comment);
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('INSERT INTO `comments`(`comment_author_id`, `message`, `event_id`) VALUES (\'' 
                             + userId + '\', \'' + encodedComment + '\', \'' + eventId + '\')', function onAddComment(err, result) {
                if(!err && result) {
                    callback(null, result.insertId);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}


// =========== Messages ===========

//Create a conversation between two people
exports.createConversation = function(senderId, receiverId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('INSERT INTO `conversations`(`sender_id`, `receiver_id`) VALUES (\'' + senderId + '\', \'' + receiverId + '\')', function onConversationCreation(err, result) {
                callback(err, result.insertId);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//Record a message between two people
exports.replyToConversation = function(senderId, receiverId, conversationId, messageReply, timeSent, callback) {
    // var encodedMessage = encodeString(messageReply);
    messageReply = mysql_real_escape_string(messageReply);
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('INSERT INTO `message_replies`(`conversation_id`, `content`, `sender_id`, `receiver_id`, `time_sent`) VALUES (\'' 
                             + conversationId + '\', \'' + messageReply + '\', \'' 
                                + senderId + '\', \'' + receiverId + '\', \'' + timeSent + '\')', function onConversationReplyInsert(err, result) {
                callback(err, result.insertId);
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

exports.getConversation = function(senderId, receiverId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM conversations where sender_id=\'' 
                             + senderId + '\' AND receiver_id=\'' + receiverId 
                                + '\' OR sender_id=\'' + receiverId + '\' AND receiver_id=\'' + senderId + '\' LIMIT 1', function onRetrieveConversation(err, rows, fields) {
                if(rows[0]) {
                    callback(err, rows[0]);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

exports.getConvosAndReplies = function(conversationId, callback) {
    getConnection(function onConnect(err, connection) {
        if(!err) {
            connection.query('SELECT * FROM message_replies INNER JOIN conversations ON '
                            + 'conversations.conversation_id = message_replies.conversation_id '
                             + 'WHERE message_replies.conversation_id = \'' + conversationId + '\'', function(err, rows, fields) {
                if(rows) {
                    var toReturn = [];
                    for(var row in rows) {
                        // var decodedMessage = decodeString(rows[row].content);
                        // var convo = { conversation_id: rows[row].conversation_id, content: decodedMessage, sender_id: rows[row].sender_id, receiver_id: rows[row].receiver_id, time_sent: rows[row].time_sent };
                        var convo = { conversation_id: rows[row].conversation_id, content: rows[row].content, sender_id: rows[row].sender_id, receiver_id: rows[row].receiver_id, time_sent: rows[row].time_sent };
                        toReturn.push(convo);
                    }
                    callback(err, toReturn);
                }
                else {
                    callback(err, null);
                }
            });
        }
        else {
            callback(err, null);
        }

        connection.release();
    });
}

//exports.getListOfReplies = function(conversationId, callback) {
//    getConnection(function onConnect(err, connection) {
//        if(!err) {
//            connection.query('SELECT * FROM message_replies where conversation_id=\'' + conversationId + '\'', function(err, rows, fields) {
//                if(rows) {
//                    callback(err, rows);
//                }
//                else {
//                    callback(err, null);
//                }
//            });
//        }
//        else {
//            callback(err, null);
//        }

        // connection.release();
//    });
//}
// 
exports.getListOfConversations = function(userId, callback) {
   getConnection(function onConnect(err, connection) {
       if(!err) {
           connection.query('SELECT message_replies.*, users.username, users.avatar_path FROM message_replies INNER JOIN `users` on message_replies.sender_id = users.user_id OR message_replies.receiver_id = users.user_id'
                + ' where users.user_id!=\'' + userId +'\'', function(err, rows, fields) {
                if(rows) {  
                    var toReturn = [];
                    // for(var i in rows) {
                        // var decodedMessage = decodeString(rows[i].content);
                        // console.log('Decoded message: ' + decodedMessage);
                        // rows[i].content = decodedMessage;
                        // toReturn.push({ messageReplyId: rows[i].message_reply_id, conversationId: rows[i].conversation_id, 
                        //     content: rows[i].content, senderId: rows[i].sender_id, receiverId: rows[i].receiver_id, timeSent: rows[i].time_sent, unread: rows[i].unread });
                    // }

                    callback(err, rows);
                }
                else {
                    callback(err, null);
                }
           });
       }
       else {
           callback(err, null);
       } 

       connection.release();
    });
}
// exports.getListOfConversations = function(userId, callback) {
//    getConnection(function onConnect(err, connection) {
//        if(!err) {
//            connection.query('SELECT * FROM conversations where sender_id=\'' + userId + '\' OR receiver_id=\'' + userId + '\'', function(err, rows, fields) {
//                if(rows) {
//                    callback(err, rows);
//                }
//                else {
//                    callback(err, null);
//                }
//            });
//        }
//        else {
//            callback(err, null);
//        } 

//        connection.release();
//     });
// }