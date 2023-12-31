const User = require("../model/user.model");
const { validationResult } = require('express-validator');
const requests = require("request");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { response } = require("express");
const crypto = require('crypto');
const Email = require('../other/sendEmail');
const key = "prakritee@123@05";
const algo = "aes-256-cbc"

exports.signup = (request, response) => {
    console.log(request.body);
    const error = validationResult(request);
    if (!error.isEmpty()) {
        return response.status(400).json({ errors: error.array() });
    }

    var cipher = crypto.createCipher(algo, key)
    var crypted = cipher.update(request.body.userPassword, 'utf8', 'hex');
    crypted += cipher.final('hex');

    request.body.userPassword = crypted;

    User.create(request.body)
        .then(async result => {

            var flag = await Email.sendMail(result.userEmail, "Verify Your Gmail Account", `<p>you are a nice person for signing up with Prakritee! You must follow this link within 30 days of registration to activate your account:</p><a href= "https://prakritee.herokuapp.com/user/verify-account/` + result._id + `">click here</a>`);

            return response.status(201).json(result)
        }).catch(err => {
            console.log(err);
            return response.status(500).json({ message: "Internal Server Error..." })
        })
}

exports.signin = (request, response) => {
    const errors = validationResult(request);
    if (!errors.isEmpty())
        return response.status(400).json({ errors: errors.array() });

    User.findOne({
        userEmail: request.body.userEmail,
        isVerify: true,
        isBlock: false
    }).then(result => {
        if (result) {
            var decipher = crypto.createDecipher(algo, key)
            var dec = decipher.update(result.userPassword, 'hex', 'utf8')
            dec += decipher.final('utf8');

            if (dec == request.body.userPassword) {
                let payload = { subject: result._id };
                let token = jwt.sign(payload, "giugifsyjhsadgjbjfbbdsfjbjbk");

                return response.status(201).json({ status: "login success", data: result, token: token })
            } else
                return response.status(401).json({ message: "Invalid Email And Password" })
        } else {
            return response.status(401).json({ failed: "login failed" })
        }
    }).catch(err => {
        return response.status(500).json({ error: "oops something went wrong" })
    })
}

exports.signinWithGoogle = (request, response) => {
    const errors = validationResult(request);
    if (!errors.isEmpty())
        return response.status(400).json({ errors: errors.array() });

    User.findOne({
        userEmail: request.body.userEmail,
        isVerify: true,
        isBlock: false
    }).then(result => {
        if (result) {
            let payload = { subject: result._id };
            let token = jwt.sign(payload, "giugifsyjhsadgjbjfbbdsfjbjbk");

            return response.status(201).json({ status: "login success", data: result, token: token })
        } else {
            return response.status(401).json({ failed: "login failed" })
        }
    }).catch(err => {
        return response.status(500).json({ error: "oops something went wrong" })
    })
}

exports.userById = (request, response) => {
    User
        .findOne({ _id: request.params.userId })
        .then(result => {
            if (result) {
                return response.status(200).json(result);
            } else {
                return response.status(200).json({ message: "No Result Found" });
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: "something went wrong" });
        });
};

exports.updateProfile = (request, response) => {
    console.log(request.body);
    console.log(request.file)

    const error = validationResult(request);
    if (!error.isEmpty()) {
        return response.status(400).json({ errors: error.array() });
    }

    if (request.file)
        request.body.userImage = "https://firebasestorage.googleapis.com/v0/b/prakriti-3d8ad.appspot.com/o/" + request.file.filename + "?alt=media&token=abcddcba"

    User.updateOne({
        _id: request.body.userId,
        isVerify: true,
        isBlock: false
    }, {
        $set: request.body
    })
        .then(result => {
            if (result.modifiedCount == 1)
                return response.status(201).json({ success: "Updated Successfully" });
            else
                return response.status(201).json({ failed: "Not Updated" });
        }).catch(err => {
            console.log(err)
            return response.status(500).json({ message: "Internal Server Error..." })
        })
}

exports.verifyAccountPage = (request, response) => {
    return response.status(200).render("verify-account.ejs", {
        apiUrl: "https://prakritee.herokuapp.com/user/get-verified-account/" + request.params.id
    });
}

exports.getVerifiedAccount = (request, response) => {
    User.updateOne({ _id: request.params.id }, {
        $set: {
            isVerify: true
        }
    })
        .then(result => {
            if (result.modifiedCount == 1)
                return response.status(200).render("success-page.ejs");
            else
                return response.status(201).json({ failed: "Something went wrong" });
        })
        .catch(err => {
            return response.status(500).json({ error: "Internal Server Error..." })
        });
}

exports.forgotPassword = (request, response) => {
    User.findOne({
        userEmail: request.body.userEmail
    }).then(async result => {
        if (result) {
            var decipher = crypto.createDecipher(algo, key)
            var dec = decipher.update(result.userPassword, 'hex', 'utf8')
            dec += decipher.final('utf8');
            result.userPassword = dec;

            var flag = await Email.sendMail(result.userEmail, "Forgot Password", `
                 <p>Your old password is here 👇🏻</p>
                 <br>
                 <h3>PASSWORD: ` + result.userPassword + `</h3>
                 `);

            if (flag) {
                return response.status(200).json({ success: "check your email", result: result });
            }
            else {
                return response.status(200).json({ message: "Something went wrong please try again later.." });
            }
        } else {
            return response.status(200).json({ message: "No User Found With This Email Address" })
        }
    }).catch(err => {
        console.log(err);
        return response.status(500).json({ error: "oops something went wrong" })
    })
}

exports.userList = (request, response) => {
    User.find({
        isVerify: true,
        isBlock: false
    }).then(result => {
        if (result.length > 0) {
            return response.status(201).json(result)
        } else {
            return response.status(201).json({ message: "Result Not Found" })
        }
    }).catch(err => {
        return response.status(500).json({ error: "oops something went wrong" })
    })
}


exports.blockUser = (request, response) => {
    console.log(request.body);
    User.updateOne({ _id: request.body.userId }, {
        $set: {
            isBlock: true
        }
    })
        .then(result => {
            if (result.modifiedCount == 1) {
                User.findOne({ _id: request.body.userId }).then(async user => {
                    if (user) {

                        var flag = await Email.sendMail(user.userEmail, "🚨 Alert From Prakritee 🚨", `<p>Your account is blocked by the Prakritee Admin.If you have any objection then contact with admin.</p>`);
                        if (flag)
                            return response.status(200).json({ success: "Successfully Blocked User" });
                        else
                            return response.status(201).json({ failed: "Blocked But Notification Not Sent.." });
                    } else
                        return response.status(201).json({ failed: "Blocked But Notification Not Sent.." });


                }).catch(err => {
                    return response.status(500).json({ error: "oops something went wrong" })
                })
            } else
                return response.status(201).json({ message: "Not Blocked.." });
        })
        .catch(err => {
            return response.status(500).json({ error: "oops something went wrong" })
        });
}

exports.unBlockUser = (request, response) => {
    console.log(request.body);

    User.updateOne({ _id: request.body.userId }, {
        $set: {
            isBlock: false
        }
    })
        .then(result => {
            console.log(result);
            if (result.modifiedCount == 1) {
                User.findOne({ _id: request.body.userId }).then(async user => {
                    if (user) {

                        var flag = await Email.sendMail(user.userEmail, "🎉 Alert From Prakritee 🎉", `<p>Your account is Unblocked by the Prakritee Admin. Now you can signin in Prakritee.com</p>`);
                        if (flag)
                            return response.status(200).json({ success: "Successfully Unblocked User" });
                        else
                            return response.status(201).json({ failed: "Unblocked But Notification Not Sent.." });
                    } else
                        return response.status(201).json({ failed: "Unblocked But Notification Not Sent.." });


                }).catch(err => {
                    return response.status(500).json({ error: "oops something went wrong" })
                })
            } else
                return response.status(201).json({ message: "Not Unblocked.." });
        })
        .catch(err => {
            return response.status(500).json({ error: "oops something went wrong" })
        });
}


exports.checkEmail = (request, response) => {
    User
        .findOne({ userEmail: request.params.userEmail })
        .then(result => {
            if (result) {
                return response.status(200).json({ exist: true });
            } else {
                return response.status(200).json({ exist: false });
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: "something went wrong" });
        });
}

exports.checkMobile = (request, response) => {
    User
        .findOne({ userMobile: request.params.userMobile })
        .then(result => {
            if (result) {
                return response.status(200).json({ exist: true });
            } else {
                return response.status(200).json({ exist: false });
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: "something went wrong" });
        });
}