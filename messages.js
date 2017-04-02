var request = require('./vars.js');
const express = require('express');
const bodyParser = require("body-parser");
const fs = require('fs');
const Slack = require('slack-node');
webhookUri = request.slackWebhook;
const nodemailer = require('nodemailer');
var user = request.user;
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: user,
        pass: request.pass
    }
});
const twitter = require('ntwitter');
var twit = new twitter({
    consumer_key: request.consumer_key,
    consumer_secret: request.consumer_secret,
    access_token_key: request.access_token_key,
    access_token_secret: request.access_token_secret
});

function postToTwitter(str, cb) {
    twit.verifyCredentials(function (err, data) {
        if (err) {
            cb("Error verifying credentials: " + err);
        } else {
            twit.updateStatus(str, function (err, data) {
                if (err) {
                    cb('Tweeting failed: ' + err);
                } else {
                    cb('Post to Twitter succeed!')
                }
            });
        }
    });
};
var FB = require('fb'),
    fb = new FB.Facebook();
var fbAccessToken = request.fbToken;

// server html
const server = express();
server.use(express.static('site'));

server.use(bodyParser.urlencoded({
    extended: true
}));
// starting of the server
server.listen(8080);

// default page
server.get('/messages.html', function (request, response) {
    response.sendFile('messages.html');
});
// extraction of the message from the client "post" 
server.post('/post.html', function (request, response) {
    var message = request.body.message;
    var date = new Date();
    var hours = date.getHours();

    //Write to local file
    var messageToFile = date + " " + hours + "\n" + message + "\n\n";
    filePath = __dirname + '/messages_sent_log.txt';
    fs.appendFile(filePath, messageToFile, function (err) {
        if (err)
            console.log(err);
        else
            console.log('Write operation complete in /messages_sent_log.txt');
    });

    //Email
    let mailOptions = {
        from: request.sender, // sender address
        to: user, // list of receivers
        subject: 'Message de l\'apllication "Messages", le ' + date + " " + hours, // Subject line
        text: message, // plain text body
        html: '<b>' + message + '</b>' // html body
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });

    //Twitter message
    postToTwitter(message, function (result) {
        console.log(result);
    });

    //Slack message

    slack = new Slack();
    slack.setWebhook(webhookUri);

    slack.webhook({
        channel: "#test_web",
        username: "bruno",
        text: message
    }, function (err, response) {
        console.log("Status envoi message Slack = " + response);
    });

    //Facebook message
    FB.setAccessToken(fbAccessToken);

    FB.api('me/feed', 'post', {
        message: message
    }, function (res) {
        if (!res || res.error) {
            console.log(!res ? 'error occurred' : res.error);
            return;
        }
        console.log('Post to Facebook to id:' + res.id);
    });

// response page
    response.sendFile(__dirname + '/site/sent.html');
});
// default forwarding for invalid addresses
server.use(function (req, res, next) {
    res.redirect('messages.html');
});